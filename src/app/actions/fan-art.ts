'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToBlob } from '@/lib/blob-upload';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const MAX_FAN_ART_SIZE = 3 * 1024 * 1024;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function requireAdmin() {
  if (ADMIN_BYPASS_ENABLED) return;
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    throw new Error('This action is restricted to administrators.');
  }
}

function revalidateFanArtPages() {
  revalidatePath('/');
  revalidatePath('/fan-art');
  revalidatePath('/admin/content');
  revalidatePath('/franchises');
}

export async function submitFanArt(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Sign in to submit your fan art.' };
  const artistName = session.user?.name?.trim() || 'Community artist';

  const contestId = String(formData.get('contestId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const image = formData.get('image');
  const rightsConfirmed = formData.get('rightsConfirmed') === 'on';
  if (!contestId || title.length < 2 || title.length > 100) {
    return { error: 'Enter an artwork title between 2 and 100 characters.' };
  }
  if (
    !(image instanceof File)
    || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)
    || image.size > MAX_FAN_ART_SIZE
    || image.size === 0
  ) {
    return { error: 'Choose a valid image smaller than 3MB.' };
  }
  if (!rightsConfirmed) return { error: 'Confirm that you created this artwork or have permission to submit it.' };

  const contest = await prisma.fanArtContest.findFirst({
    where: { id: contestId, status: 'OPEN' },
    include: { franchise: { select: { name: true } } },
  });
  if (!contest) return { error: 'This contest is no longer accepting submissions.' };

  const imageUrl = await uploadImageToBlob(image, 'fan-art-contest', MAX_FAN_ART_SIZE);
  const created = await prisma.$transaction(async (tx) => {
    const stillOpen = await tx.fanArtContest.findFirst({
      where: { id: contest.id, status: 'OPEN' },
      select: { id: true },
    });
    if (!stillOpen) return false;

    await tx.fanArtSubmission.create({
      data: {
        contestId: contest.id,
        franchiseId: contest.franchiseId,
        submittedByUserId: userId,
        title,
        artistName,
        imageUrl,
        month: contest.month,
        year: contest.year,
        reviewStatus: 'PENDING',
        isActive: false,
      },
    });
    return true;
  });
  if (!created) return { error: 'This contest closed while your image was uploading. Please try again next month.' };

  revalidateFanArtPages();
  return { success: true };
}

export async function voteForFanArt(contestId: string, submissionId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Sign in to vote for your favorite artwork.' };
  if (!contestId.trim() || !submissionId.trim()) return { error: 'Choose an artwork to vote for.' };

  try {
    const eligible = await prisma.$transaction(async (tx) => {
      const eligibleSubmission = await tx.fanArtSubmission.findFirst({
        where: {
          id: submissionId,
          contestId,
          reviewStatus: 'APPROVED',
          isActive: true,
          contest: { status: 'OPEN' },
        },
        select: { id: true },
      });
      if (!eligibleSubmission) return false;

      await tx.fanArtVote.create({
        data: { contestId, submissionId, userId },
      });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!eligible) return { error: 'This artwork is not eligible for voting in the open contest.' };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'You have already voted in this contest.' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return { error: 'Voting status changed. Refresh the page and try again.' };
    }
    throw error;
  }

  revalidateFanArtPages();
  return { success: true };
}

export async function createFanArtContest(formData: FormData) {
  await requireAdmin();
  const franchiseId = String(formData.get('franchiseId') ?? '').trim();
  const monthKey = String(formData.get('month') ?? '').trim();
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!franchiseId || !match) throw new Error('Select a franchise and a valid contest month.');

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex >= MONTH_NAMES.length || year < 2020 || year > 2100) {
    throw new Error('Select a valid contest month.');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingOpenContest = await tx.fanArtContest.findFirst({
        where: { status: 'OPEN' },
        select: { id: true },
      });
      if (existingOpenContest) {
        throw new Error('Close the current monthly contest before opening another one.');
      }

      const existingMonth = await tx.fanArtContest.findUnique({
        where: { year_month: { year, month: MONTH_NAMES[monthIndex] } },
        select: { id: true },
      });
      if (existingMonth) throw new Error('A contest already exists for the selected month.');

      await tx.fanArtContest.create({
        data: { franchiseId, month: MONTH_NAMES[monthIndex], year },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('A contest already exists for the selected month.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new Error('Another contest change happened at the same time. Refresh and try again.');
    }
    throw error;
  }
  revalidateFanArtPages();
}

export async function closeFanArtContest(contestId: string) {
  await requireAdmin();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const contest = await tx.fanArtContest.findFirst({
      where: { id: contestId, status: 'OPEN' },
      select: { id: true, franchiseId: true },
    });
    if (!contest) throw new Error('This contest is no longer open.');

    const leadingEntry = await tx.fanArtSubmission.findFirst({
      where: { contestId, reviewStatus: 'APPROVED', isActive: true },
      orderBy: [{ votes: { _count: 'desc' } }, { createdAt: 'asc' }],
      select: { id: true, imageUrl: true, _count: { select: { votes: true } } },
    });
    const winner = leadingEntry && leadingEntry._count.votes > 0 ? leadingEntry : null;

    const claimed = await tx.fanArtContest.updateMany({
      where: { id: contestId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: now, winnerSubmissionId: winner?.id ?? null },
    });
    if (claimed.count === 0) throw new Error('This contest was already closed.');

    await tx.fanArtSubmission.updateMany({
      where: { contestId, reviewStatus: 'PENDING' },
      data: {
        reviewStatus: 'REJECTED',
        rejectionReason: 'The contest closed before this entry could be reviewed.',
        isActive: false,
      },
    });

    if (winner) {
      await tx.fanArtSubmission.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      });
      await tx.fanArtSubmission.update({
        where: { id: winner.id },
        data: { isFeatured: true },
      });
      await tx.franchise.update({
        where: { id: contest.franchiseId },
        data: { coverImage: winner.imageUrl, bannerImage: winner.imageUrl },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidateFanArtPages();
}

export async function approveContestFanArt(submissionId: string) {
  await requireAdmin();
  const result = await prisma.fanArtSubmission.updateMany({
    where: { id: submissionId, reviewStatus: 'PENDING', contest: { status: 'OPEN' } },
    data: { reviewStatus: 'APPROVED', rejectionReason: null, isActive: true },
  });
  if (result.count === 0) throw new Error('This submission is no longer awaiting review in an open contest.');
  revalidateFanArtPages();
}

export async function rejectContestFanArt(submissionId: string, formData: FormData) {
  await requireAdmin();
  const rejectionReason = String(formData.get('rejectionReason') ?? '').trim();
  if (!rejectionReason || rejectionReason.length > 500) {
    throw new Error('Provide a rejection reason between 1 and 500 characters.');
  }
  const result = await prisma.fanArtSubmission.updateMany({
    where: { id: submissionId, reviewStatus: 'PENDING', contest: { status: 'OPEN' } },
    data: { reviewStatus: 'REJECTED', rejectionReason, isActive: false },
  });
  if (result.count === 0) throw new Error('This submission is no longer awaiting review in an open contest.');
  revalidateFanArtPages();
}
