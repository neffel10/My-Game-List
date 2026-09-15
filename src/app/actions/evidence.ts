'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToBlob } from '@/lib/blob-upload';
import { revalidatePath } from 'next/cache';

const MAX_EVIDENCE_FILE_SIZE = 4 * 1024 * 1024;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

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

  if (!progressId) {
    return { error: 'No game record was found to attach this proof to.' };
  }

  if (!(file instanceof File)) {
    return { error: 'Please select a valid image file.' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed as proof.' };
  }

  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    return {
      error: 'The image is too large. Please use a file smaller than 4MB.',
    };
  }

  const progress = await prisma.userGameProgress.findUnique({
    where: { id: progressId },
    include: { user: true },
  });

  if (!progress) {
    return { error: 'This game progress record could not be found.' };
  }

  if (progress.userId !== session.user.id) {
    return { error: 'You can only upload evidence for your own progression.' };
  }

  if (!progress.completed && !progress.mastered) {
    return {
      error: 'Mark the game as completed before uploading evidence of completion.',
    };
  }

  let imageUrl: string;

  try {
    imageUrl = await uploadImageToBlob(file, 'evidence', MAX_EVIDENCE_FILE_SIZE);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'The proof image could not be uploaded to storage.',
    };
  }

  await prisma.evidenceSubmission.upsert({
    where: { progressId },
    update: {
      imageUrl,
      status: 'PENDING',
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
  revalidatePath('/');

  return { success: true, status: 'PENDING' };
}

export async function reviewEvidenceSubmission(
  evidenceId: string,
  status: 'APPROVED' | 'REJECTED'
) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Unauthorized. Please sign in with an admin account.' };
  }

  if (!isAdminEmail(session.user.email)) {
    return { error: 'This action is restricted to administrators.' };
  }

  const evidence = await prisma.evidenceSubmission.findUnique({
    where: { id: evidenceId },
  });

  if (!evidence) {
    return { error: 'Evidence submission not found.' };
  }

  await prisma.evidenceSubmission.update({
    where: { id: evidenceId },
    data: {
      status,
    },
  });

  revalidatePath('/admin/evidence');
  revalidatePath('/profile');
}

export async function approveEvidenceSubmission(evidenceId: string) {
  'use server';
  await reviewEvidenceSubmission(evidenceId, 'APPROVED');
}

export async function rejectEvidenceSubmission(evidenceId: string) {
  'use server';
  await reviewEvidenceSubmission(evidenceId, 'REJECTED');
}
