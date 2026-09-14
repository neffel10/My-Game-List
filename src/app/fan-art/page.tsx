import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { prisma } from '@/lib/prisma';

export default async function FanArtPage() {
  const fanArts = await prisma.fanArtSubmission.findMany({
    where: { isActive: true },
    include: { franchise: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Fan Art</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Community art showcase</h1>
          </div>
          <Link href="/franchises" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Explore franchises
          </Link>
        </div>

        {fanArts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No fan art has been published yet. Submit one from the admin panel.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {fanArts.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl">
                <div className="relative h-72 w-full bg-zinc-800">
                  <Image src={item.imageUrl} alt={item.title} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.franchise?.name ?? 'Community'}</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{item.title}</h2>
                    </div>
                    {item.isFeatured && (
                      <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-200">
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-zinc-400">
                    <span>Artist</span>
                    <span className="font-medium text-zinc-200">{item.artistName}</span>
                  </div>

                  <p className="text-xs text-zinc-500">
                    {item.month} {item.year}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
