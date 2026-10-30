import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { grantApprovedEvidenceRewards } from '@/lib/evidence-rewards';
import { revalidatePath } from 'next/cache';

const AUTO_APPROVAL_DELAY_MS = 72 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - AUTO_APPROVAL_DELAY_MS);
  const overdueEvidence = await prisma.evidenceSubmission.findMany({
    where: { status: 'PENDING', createdAt: { lte: cutoff } },
    select: {
      id: true,
      userId: true,
      progress: { select: { gameId: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  let autoApprovedCount = 0;
  for (const evidence of overdueEvidence) {
    const autoApproved = await prisma.$transaction(async (tx) => {
      const existingMasteryAward = await tx.pointAward.findUnique({
        where: {
          userId_gameId_type: {
            userId: evidence.userId,
            gameId: evidence.progress.gameId,
            type: 'GAME_MASTERED_BONUS',
          },
        },
        select: { id: true },
      });
      const masteryAlreadyAwarded = Boolean(existingMasteryAward);
      const claimed = await tx.evidenceSubmission.updateMany({
        where: {
          id: evidence.id,
          status: 'PENDING',
          createdAt: { lte: cutoff },
        },
        data: {
          status: masteryAlreadyAwarded ? 'MASTERED_APPROVED' : 'APPROVED',
          masteredApproved: masteryAlreadyAwarded,
          rejectionReason: null,
          reviewedAt: now,
        },
      });

      if (claimed.count === 0) return false;

      await grantApprovedEvidenceRewards(tx, {
        userId: evidence.userId,
        gameId: evidence.progress.gameId,
        masteredApproved: masteryAlreadyAwarded,
        availableAt: now,
      });
      return true;
    });

    if (autoApproved) autoApprovedCount += 1;
  }

  if (autoApprovedCount > 0) {
    revalidatePath('/admin/evidence');
    revalidatePath('/profile');
    revalidatePath('/franchises', 'layout');
  }

  return NextResponse.json({ autoApprovedCount, checkedCount: overdueEvidence.length });
}
