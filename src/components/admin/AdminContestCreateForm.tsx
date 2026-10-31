'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFanArtContest } from '@/app/actions/fan-art';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface FranchiseOption {
  id: string;
  name: string;
}

export default function AdminContestCreateForm({ franchises }: { franchises: FranchiseOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { locale, t } = useLanguage();

  const handleSubmit = async (formData: FormData) => {
    setPending(true);
    setError(null);
    try {
      const result = await createFanArtContest(formData);
      if (result.error) {
        const conflict = result.error.match(/^A contest already exists for (.+)\. Each month can have only one franchise contest\.$/);
        const openContest = result.error.match(/^Close the open (.+) contest for (.+) before opening another contest\.$/);
        setError(locale === 'es' && conflict
          ? `Ya existe un concurso para ${conflict[1]}. Solo puede haber un concurso de franquicia por mes.`
          : locale === 'es' && openContest
            ? `Cierra primero el concurso abierto de ${openContest[2]} (${openContest[1]}) para poder abrir otro.`
          : result.error);
        return;
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? t(actionError.message) : t('The contest could not be opened. Please refresh and try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      {error && (
        <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 sm:col-span-3">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        {t('Franchise for this month')}
        <select name="franchiseId" required className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
          <option value="">{t('Select a franchise')}</option>
          {franchises.map((franchise) => <option key={franchise.id} value={franchise.id}>{franchise.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        {t('Contest month')}
        <input name="month" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-60">
        {pending ? t('Opening...') : t('Open contest')}
      </button>
    </form>
  );
}
