import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { prisma } from '@/lib/prisma';

export default async function RewardsPage() {
  const rewards = await prisma.reward.findMany({
    where: { isActive: true },
    orderBy: { pointsRequired: 'asc' },
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Rewards</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Earned prizes</h1>
          </div>
          <Link href="/franchises" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Explore sagas
          </Link>
        </div>

        {rewards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No rewards are available yet. The admin can add new prizes here.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
              <article key={reward.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl">
                <div className="relative h-52 w-full bg-zinc-800">
                  <Image src={reward.imageUrl} alt={reward.title} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{reward.category}</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{reward.title}</h2>
                    </div>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                      {reward.pointsRequired} pts
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Sponsor</span>
                      <span className="font-medium text-white">{reward.company}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Stock</span>
                      <span className="font-medium text-white">{reward.stock}</span>
                    </div>
                  </div>

                  {reward.description && <p className="text-sm text-zinc-400">{reward.description}</p>}

                  {reward.externalLink ? (
                    <a href={reward.externalLink} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
                      View reward
                    </a>
                  ) : (
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300">
                      Prize available on request
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
