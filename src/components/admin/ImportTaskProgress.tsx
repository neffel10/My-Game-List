'use client';

import { useEffect, useState } from 'react';

type ImportTask = {
  franchiseName: string;
  status: string;
  phase: string;
  progress: number;
  total: number;
  importedGames: number;
  error: string | null;
};

export default function ImportTaskProgress({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<ImportTask | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const response = await fetch(`/api/admin/import-tasks/${taskId}`, { cache: 'no-store' });
      if (!response.ok || !active) return;
      const nextTask = (await response.json()) as ImportTask;
      setTask(nextTask);
      if (nextTask.status === 'PENDING' || nextTask.status === 'RUNNING') {
        timer = setTimeout(poll, 1500);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [taskId]);

  if (!task) {
    return <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">Loading import task...</div>;
  }

  const isFailed = task.status === 'FAILED';
  const isDone = task.status === 'COMPLETED';

  return (
    <div className={`rounded-xl border p-4 ${isFailed ? 'border-red-400/30 bg-red-500/10' : isDone ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-cyan-400/30 bg-cyan-500/10'}`}>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-white">{task.franchiseName}</span>
        <span className="text-cyan-100">{task.progress}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
        <div className={`h-full rounded-full transition-all ${isFailed ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${task.progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-300">{task.phase}</p>
      {task.total > 0 && <p className="mt-1 text-xs text-zinc-400">{task.importedGames} of {task.total} games imported</p>}
      {task.error && <p className="mt-2 text-xs text-red-200">{task.error}</p>}
    </div>
  );
}
