import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import RewardCard from '@/components/rewards/RewardCard';

export default async function RewardsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const rewards = await prisma.reward.findMany({
    where: { isActive: true, deliveryType: { in: ['DIGITAL_DOWNLOAD', 'DIGITAL_CODE'] } },
    orderBy: { pointsRequired: 'asc' },
  });
  const [earnedPoints, spentPoints, redemptions] = userId
    ? await Promise.all([
        prisma.pointAward.aggregate({
          where: { userId, availableAt: { lte: new Date() } },
          _sum: { points: true },
        }),
        prisma.rewardRedemption.aggregate({
          where: { userId },
          _sum: { pointsSpent: true },
        }),
        prisma.rewardRedemption.findMany({
          where: { userId },
          select: { rewardId: true },
        }),
      ])
    : [null, null, []];
  const pointsBalance = Math.max(0, (earnedPoints?._sum.points ?? 0) - (spentPoints?._sum.pointsSpent ?? 0));
  const redeemedRewardIds = new Set(redemptions.map((redemption) => redemption.rewardId));

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Rewards</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Digital rewards</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {userId && (
              <Link href="/rewards/my" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
                My rewards
              </Link>
            )}
            <Link href="/franchises" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
              Explore sagas
            </Link>
          </div>
        </div>
        <p className="mb-6 text-sm text-zinc-400">
          Redeem points instantly for digital downloads and codes. Physical rewards are not available yet.
          {userId && <span className="ml-2 font-semibold text-white">Your balance: {pointsBalance} pts</span>}
        </p>

        {rewards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No digital rewards are available yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={{
                  id: reward.id,
                  title: reward.title,
                  company: reward.company,
                  imageUrl: reward.imageUrl,
                  description: reward.description,
                  pointsRequired: reward.pointsRequired,
                  stock: reward.stock,
                  deliveryType: reward.deliveryType as 'DIGITAL_DOWNLOAD' | 'DIGITAL_CODE',
                }}
                pointsBalance={pointsBalance}
                isSignedIn={Boolean(userId)}
                isRedeemed={redeemedRewardIds.has(reward.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
