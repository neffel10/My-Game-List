'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Download, Ticket, LoaderCircle } from 'lucide-react';
import { redeemReward } from '@/app/actions/rewards';
import ImageLightbox from '@/components/shared/ImageLightbox';

interface RewardCardProps {
  reward: {
    id: string;
    title: string;
    company: string;
    imageUrl: string;
    description: string | null;
    pointsRequired: number;
    stock: number;
    deliveryType: 'DIGITAL_DOWNLOAD' | 'DIGITAL_CODE';
  };
  pointsBalance: number;
  isSignedIn: boolean;
  isRedeemed: boolean;
}

export default function RewardCard({ reward, pointsBalance, isSignedIn, isRedeemed }: RewardCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRedeem = async () => {
    setPending(true);
    setError(null);
    const result = await redeemReward(reward.id);
    if ('error' in result) {
      setError(result.error ?? 'The reward could not be redeemed.');
      setPending(false);
      return;
    }
    router.push('/rewards/my');
    router.refresh();
  };

  const hasEnoughPoints = pointsBalance >= reward.pointsRequired;
  const isOutOfStock = reward.stock <= 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl">
      <div className="relative h-52 w-full bg-zinc-800">
        <ImageLightbox
          src={reward.imageUrl}
          alt={`${reward.title} preview`}
          className="h-full w-full"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          watermarkText="PREVIEW · REDEEM TO UNLOCK"
        />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Digital reward</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{reward.title}</h2>
            <p className="text-sm text-zinc-400">Provided by {reward.company}</p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
            {reward.pointsRequired} pts
          </span>
        </div>

        {reward.description && <p className="text-sm text-zinc-400">{reward.description}</p>}

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-zinc-300">
            {reward.deliveryType === 'DIGITAL_CODE' ? <Ticket className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {reward.deliveryType === 'DIGITAL_CODE' ? 'Digital code' : 'Image download'}
          </span>
          <span className="text-xs text-zinc-500">{reward.stock} available</span>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

        {isRedeemed ? (
          <Link href="/rewards/my" className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100">
            <LockKeyhole className="h-4 w-4" />
            Redeemed · View reward
          </Link>
        ) : !isSignedIn ? (
          <Link href="/profile" className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200 hover:bg-white/10">
            Sign in to redeem
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleRedeem}
            disabled={pending || !hasEnoughPoints || isOutOfStock}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            {pending
              ? 'Redeeming...'
              : isOutOfStock
                ? 'Out of stock'
                : hasEnoughPoints
                  ? 'Redeem now'
                  : `Need ${reward.pointsRequired - pointsBalance} more points`}
          </button>
        )}
      </div>
    </article>
  );
}
