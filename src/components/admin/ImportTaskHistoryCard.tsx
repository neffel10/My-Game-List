'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteImportTask, setImportTaskHidden } from '@/app/actions/content-admin';
import ImportTaskProgress from '@/components/admin/ImportTaskProgress';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface ImportHistoryTask {
  id: string;
  franchiseName: string;
  status: string;
  phase: string;
  total: number;
  importedGames: number;
  error: string | null;
  log: string | null;
  isHidden: boolean;
}

export default function ImportTaskHistoryCard({ task }: { task: ImportHistoryTask }) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const toggleHidden = async () => {
    setPending(true);
    setActionError(null);
    try {
      await setImportTaskHidden(task.id, !task.isHidden);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? t(error.message) : t('The import log could not be updated.'));
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`${t('Permanently delete the import log for')} ${task.franchiseName}?`)) return;
    setPending(true);
    setActionError(null);
    try {
      await deleteImportTask(task.id);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? t(error.message) : t('The import log could not be deleted.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-3">
      <ImportTaskProgress taskId={task.id} />
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white">{t('View detailed log')}</summary>
        <dl className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
          <div><dt className="text-zinc-500">{t('Franchise')}</dt><dd className="text-zinc-200">{task.franchiseName}</dd></div>
          <div><dt className="text-zinc-500">{t('Status')}</dt><dd className="text-zinc-200">{task.status} · {task.phase}</dd></div>
          <div><dt className="text-zinc-500">{t('Games imported')}</dt><dd className="text-zinc-200">{task.importedGames} / {task.total}</dd></div>
          {task.error && <div className="sm:col-span-2"><dt className="text-zinc-500">{t('Error')}</dt><dd className="text-red-200">{task.error}</dd></div>}
        </dl>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-300">
          {task.log || t('No detailed log was saved for this older import task.')}
        </pre>
      </details>
      {actionError && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{actionError}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={toggleHidden} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50">
          {task.isHidden ? t('Restore to history') : t('Hide log')}
        </button>
        <button type="button" disabled={pending} onClick={remove} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-50">
          {t('Delete log')}
        </button>
      </div>
    </article>
  );
}
