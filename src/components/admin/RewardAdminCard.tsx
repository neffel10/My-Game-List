'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteReward, toggleRewardStatus, updateReward } from '@/app/actions/content-admin';
import ImageLightbox from '@/components/shared/ImageLightbox';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface RewardAdminItem {
  id: string;
  title: string;
  company: string;
  imageUrl: string;
  description: string | null;
  pointsRequired: number;
  stock: number;
  category: string;
  deliveryType: string;
  isActive: boolean;
}

export default function RewardAdminCard({ reward }: { reward: RewardAdminItem }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const save = async (formData: FormData) => {
    setPending(true);
    setMessage(null);
    try {
      const result = await updateReward(reward.id, formData);
      if (result.error) {
        setMessage(t(result.error));
        return;
      }
      setMessage('Reward updated.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? t(error.message) : t('The reward could not be updated.'));
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`${t('Delete')} "${reward.title}" permanently?`)) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await deleteReward(reward.id);
      if (result.error) {
        setMessage(t(result.error));
        return;
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? t(error.message) : t('The reward could not be deleted.'));
    } finally {
      setPending(false);
    }
  };

  const toggle = async () => {
    setPending(true);
    try {
      await toggleRewardStatus(reward.id, !reward.isActive);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? t(error.message) : t('The reward status could not be changed.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
      <div className="relative h-40 w-full">
        <ImageLightbox src={reward.imageUrl} alt={`${reward.title} preview`} className="h-full w-full" sizes="(max-width: 768px) 100vw, 50vw" watermarkText={t('PREVIEW · REDEEM TO UNLOCK')} />
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{reward.title}</p>
            <p className="text-xs text-zinc-400">{reward.company}</p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
            {t(reward.category)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
          <span>{reward.pointsRequired} pts</span>
          <span>{reward.deliveryType === 'DIGITAL_CODE' ? 'Digital code' : 'Image download'} · {reward.stock} available</span>
        </div>
        {message && <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={toggle} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10 disabled:opacity-50">
            {reward.isActive ? t('Hide') : t('Show')}
          </button>
          <button type="button" disabled={pending} onClick={remove} className="rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-500/15 disabled:opacity-50">
            {t('Delete')}
          </button>
        </div>
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white">{t('Edit reward')}</summary>
          <form action={save} className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs text-zinc-400">{t('Reward title')}<input name="title" required defaultValue={reward.title} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <label className="grid gap-1 text-xs text-zinc-400">{t('Sponsor / company')}<input name="company" required defaultValue={reward.company} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <label className="grid gap-1 text-xs text-zinc-400">{t('Points required')}<input name="pointsRequired" type="number" min="1" required defaultValue={reward.pointsRequired} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            {reward.deliveryType === 'DIGITAL_DOWNLOAD' && <label className="grid gap-1 text-xs text-zinc-400">{t('Available downloads')}<input name="stock" type="number" min="0" required defaultValue={reward.stock} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>}
            <label className="grid gap-1 text-xs text-zinc-400">{t('Description')}<textarea name="description" rows={2} defaultValue={reward.description ?? ''} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <label className="grid gap-1 text-xs text-zinc-400">{t('Replace artwork')} {reward.deliveryType === 'DIGITAL_DOWNLOAD' ? `(${t('also replaces the downloadable file')})` : `(${t('preview only')})`}<input name="image" type="file" accept="image/*" className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-300" /></label>
            {reward.deliveryType === 'DIGITAL_CODE' && <label className="grid gap-1 text-xs text-zinc-400">{t('Add digital codes (one per line)')}<textarea name="digitalCodes" rows={3} maxLength={50000} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white" /></label>}
            <button type="submit" disabled={pending} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-50">{pending ? t('Saving...') : t('Save changes')}</button>
          </form>
        </details>
      </div>
    </article>
  );
}
