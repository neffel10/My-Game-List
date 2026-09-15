import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Community</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Community hub</h1>
          </div>
          <Link href="/franchises" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Explore franchises
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Status</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Live</h2>
            <p className="mt-2 text-sm text-zinc-400">The community area is active and ready for future features.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Next</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Member feed</h2>
            <p className="mt-2 text-sm text-zinc-400">Leaderboard, recent uploads, and progress highlights are planned here.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Now</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Use the app</h2>
            <p className="mt-2 text-sm text-zinc-400">Keep tracking your franchise checklist and submit proof from your profile.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
