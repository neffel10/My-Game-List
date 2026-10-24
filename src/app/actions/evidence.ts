'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToBlob } from '@/lib/blob-upload';
import { getEvidencePointsAvailableAt } from '@/lib/gamification';
import { revalidatePath } from 'next/cache';

const MAX_EVIDENCE_FILE_SIZE = 4 * 1024 * 1024;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function uploadEvidence(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Please sign in to upload proof of completion.' };
  }

  const progressId = String(formData.get('progressId') ?? '').trim();
  const file = formData.get('file');

  if (!progressId) return { error: 'No game record was found to attach this proof to.' };
  if (!(file instanceof File)) return { error: 'Please select a valid image file.' };
  if (!file.type.startsWith('image/')) return { error: 'Only image files are allowed as proof.' };
  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    return { error: 'The image is too large. Please use a file smaller than 4MB.' };
  }

  const progress = await prisma.userGameProgress.findUnique({ where: { id: progressId } });
  if (!progress) return { error: 'This game progress record could not be found.' };
  if (progress.userId !== session.user.id) return { error: 'You can only upload evidence for your own progression.' };
  if (!progress.completed && !progress.mastered) {
    return { error: 'Mark the game as completed before uploading evidence of completion.' };
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadImageToBlob(file, 'evidence', MAX_EVIDENCE_FILE_SIZE);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The proof image could not be uploaded to storage.' };
  }

  await prisma.evidenceSubmission.upsert({
    where: { progressId },
    update: {
      imageUrl,
      status: 'PENDING',
      rejectionReason: null,
      masteredApproved: false,
      reviewedAt: null,
      createdAt: new Date(),
    },
    create: {
      userId: session.user.id,
      progressId,
      imageUrl,
      status: 'PENDING',
    },
  });

  revalidatePath('/profile');
  revalidatePath('/admin/evidence');
  revalidatePath('/franchises', 'layout');
  return { success: true, status: 'PENDING' };
}

export async function reviewEvidenceSubmission(evidenceId: string, formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!ADMIN_BYPASS_ENABLED && (!email || !isAdminEmail(email))) {
    throw new Error('This action is restricted to administrators.');
  }

  const decision = String(formData.get('decision') ?? '');
  const masteredApproved = formData.get('masteredApproved') === 'on';
  const rejectionReason = String(formData.get('rejectionReason') ?? '').trim();
  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    throw new Error('Choose whether to approve or reject the evidence.');
  }
  if (decision === 'REJECTED' && !rejectionReason) {
    throw new Error('Provide a reason when rejecting evidence.');
  }

  const evidence = await prisma.evidenceSubmission.findUnique({
    where: { id: evidenceId },
    include: {
      progress: {
        include: {
          game: {
            include: { subcategory: { include: { franchise: true } } },
          },
        },
      },
    },
  });
  if (!evidence) throw new Error('Evidence submission not found.');
  if (evidence.status === 'REJECTED' && decision === 'APPROVED') {
    throw new Error('The user must upload new evidence before it can be approved.');
  }
  if (decision === 'REJECTED' && evidence.status !== 'PENDING') {
    throw new Error('Only pending evidence can be rejected.');
  }

  const now = new Date();
  if (decision === 'REJECTED') {
    await prisma.evidenceSubmission.update({
      where: { id: evidenceId },
      data: { status: 'REJECTED', rejectionReason, reviewedAt: now, masteredApproved: false },
    });
  } else {
    const availableAt = getEvidencePointsAvailableAt(evidence.createdAt, now);
    const gameId = evidence.progress.gameId;
    const userId = evidence.userId;
    const existingMasteryAward = await prisma.pointAward.findUnique({
      where: { userId_gameId_type: { userId, gameId, type: 'GAME_MASTERED_BONUS' } },
      select: { id: true },
    });
    const finalMasteryApproval = masteredApproved || evidence.masteredApproved || Boolean(existingMasteryAward);

    await prisma.$transaction(async (tx) => {
      await tx.evidenceSubmission.update({
        where: { id: evidenceId },
        data: {
          status: finalMasteryApproval ? 'MASTERED_APPROVED' : 'APPROVED',
          rejectionReason: null,
          masteredApproved: finalMasteryApproval,
          reviewedAt: now,
        },
      });

      await tx.pointAward.upsert({
        where: { userId_gameId_type: { userId, gameId, type: 'GAME_COMPLETED' } },
        update: {},
        create: { userId, gameId, type: 'GAME_COMPLETED', points: 100, availableAt },
      });

      if (finalMasteryApproval) {
        await tx.pointAward.upsert({
          where: { userId_gameId_type: { userId, gameId, type: 'GAME_MASTERED_BONUS' } },
          update: {},
          create: { userId, gameId, type: 'GAME_MASTERED_BONUS', points: 50, availableAt },
        });
      }

      const rewardAvatar = await tx.unlockableAvatar.findFirst({
        where: {
          games: { some: { id: gameId } },
          OR: [{ requiredMaster: false }, ...(finalMasteryApproval ? [{ requiredMaster: true }] : [])],
        },
      });
      if (rewardAvatar) {
        await tx.userUnlockedAvatar.upsert({
          where: { userId_avatarId: { userId, avatarId: rewardAvatar.id } },
          update: {},
          create: { userId, avatarId: rewardAvatar.id },
        });
      }
    });

    const franchiseId = evidence.progress.game.subcategory.franchiseId;
    const franchiseGames = await prisma.game.findMany({
      where: { subcategory: { franchiseId } },
      select: { id: true },
    });
    const approvedGameIds = await prisma.evidenceSubmission.findMany({
      where: {
        userId,
        status: { in: ['APPROVED', 'MASTERED_APPROVED'] },
        progress: { gameId: { in: franchiseGames.map((game) => game.id) } },
      },
      select: { progress: { select: { gameId: true } } },
    });

    if (franchiseGames.length > 0 && approvedGameIds.length === franchiseGames.length) {
      const franchise = evidence.progress.game.subcategory.franchise;
      const completionAvatar = await prisma.unlockableAvatar.upsert({
        where: { catalogKey: `franchise-completion-${franchiseId}` },
        update: {},
        create: {
          catalogKey: `franchise-completion-${franchiseId}`,
          title: `${franchise.name} Completion`,
          imageUrl: franchise.coverImage,
          franchiseId,
          requiredMaster: false,
        },
      });
      await prisma.userUnlockedAvatar.upsert({
        where: { userId_avatarId: { userId, avatarId: completionAvatar.id } },
        update: {},
        create: { userId, avatarId: completionAvatar.id },
      });
    }
  }

  revalidatePath('/admin/evidence');
  revalidatePath('/profile');
  revalidatePath('/franchises', 'layout');
}

export async function approveEvidenceSubmission(evidenceId: string, formData: FormData) {
  formData.set('decision', 'APPROVED');
  await reviewEvidenceSubmission(evidenceId, formData);
}

export async function rejectEvidenceSubmission(evidenceId: string, formData: FormData) {
  formData.set('decision', 'REJECTED');
  await reviewEvidenceSubmission(evidenceId, formData);
}
