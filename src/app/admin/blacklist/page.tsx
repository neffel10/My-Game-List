import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { auth } from '@/auth';
import { getGameBlacklistModel } from '@/lib/game-blacklist';
import { removeBlacklistedGame } from '@/app/actions/game-admin';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminBlacklistPage() {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();

  if (!session?.user || !userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    redirect('/');
  }

  const blacklistModel = getGameBlacklistModel();

  if (!blacklistModel) {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
            <h1 className="text-2xl font-bold">Blacklist model unavailable</h1>
            <p className="mt-2 text-sm text-amber-50/80">
              Regenerate the Prisma client and restart the dev server so the blacklist table is exposed by the generated client.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const blacklistedGames = (await blacklistModel.findMany({
    orderBy: { createdAt: 'desc' },
  })) as Array<{
    id: string;
    title: string;
    franchiseSlug: string;
    rawgSlug?: string | null;
    reason?: string | null;
    createdAt: Date;
  }>;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/profile"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Blacklisted games</h1>
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200">
            Admin control
          </div>
        </div>

        {blacklistedGames.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No games are currently blacklisted.
          </div>
        ) : (
          <div className="space-y-4">
            {blacklistedGames.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-red-300" />
                    <span className="text-base font-semibold text-white">{entry.title}</span>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.15em] text-zinc-400">
                    {entry.franchiseSlug}
                  </div>
                  {entry.rawgSlug && (
                    <div className="mt-1 text-sm text-zinc-400">RAWG slug: {entry.rawgSlug}</div>
                  )}
                  {entry.reason && <div className="mt-1 text-sm text-zinc-300">Reason: {entry.reason}</div>}
                </div>

                <form action={removeBlacklistedGame.bind(null, entry.id)}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15 cursor-pointer"
                  >
                    Restore
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
