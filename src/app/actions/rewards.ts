'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function redeemReward(rewardId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Sign in to redeem digital rewards.' };
  if (!rewardId.trim()) return { error: 'Choose a reward to redeem.' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findFirst({
        where: {
          id: rewardId,
          isActive: true,
          deliveryType: { in: ['DIGITAL_DOWNLOAD', 'DIGITAL_CODE'] },
        },
        select: { id: true, pointsRequired: true, stock: true, deliveryType: true, digitalAssetUrl: true },
      });
      if (!reward) return { error: 'This digital reward is not available.' };
      if (reward.deliveryType === 'DIGITAL_DOWNLOAD' && !reward.digitalAssetUrl) {
        return { error: 'This reward is missing its download file. Please contact an administrator.' };
      }

      const previousRedemption = await tx.rewardRedemption.findUnique({
        where: { userId_rewardId: { userId, rewardId } },
        select: { id: true },
      });
      if (previousRedemption) return { error: 'You have already redeemed this reward.' };

      const now = new Date();
      const earned = await tx.pointAward.aggregate({
        where: { userId, availableAt: { lte: now } },
        _sum: { points: true },
      });
      const spent = await tx.rewardRedemption.aggregate({
        where: { userId },
        _sum: { pointsSpent: true },
      });
      const balance = (earned._sum.points ?? 0) - (spent._sum.pointsSpent ?? 0);
      if (balance < reward.pointsRequired) {
        return { error: `You need ${reward.pointsRequired - balance} more points to redeem this reward.` };
      }

      let availableCode: { id: string } | null = null;
      if (reward.deliveryType === 'DIGITAL_CODE') {
        availableCode = await tx.rewardDigitalCode.findFirst({
          where: { rewardId: reward.id, redemptionId: null },
          select: { id: true },
          orderBy: { id: 'asc' },
        });
        if (!availableCode) return { error: 'This reward is out of stock.' };
      }

      const stock = await tx.reward.updateMany({
        where: { id: reward.id, isActive: true, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (stock.count === 0) return { error: 'This reward is out of stock.' };

      const redemption = await tx.rewardRedemption.create({
        data: { userId, rewardId, pointsSpent: reward.pointsRequired },
        select: { id: true },
      });

      if (availableCode) {
        const claimed = await tx.rewardDigitalCode.updateMany({
          where: { id: availableCode.id, redemptionId: null },
          data: { redemptionId: redemption.id },
        });
        if (claimed.count === 0) throw new Error('Digital code reservation was concurrently modified.');
      }

      return { redemptionId: redemption.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in result) return result;

    revalidatePath('/rewards');
    revalidatePath('/rewards/my');
    revalidatePath('/profile');
    return { success: true, redemptionId: result.redemptionId };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return { error: 'Another redemption was processed at the same time. Please try again.' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'You have already redeemed this reward.' };
    }
    throw error;
  }
}
