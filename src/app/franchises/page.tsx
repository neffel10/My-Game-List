import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FranchiseCard from '@/components/home/FranchiseCard';
import { prisma } from '@/lib/prisma';

export default async function FranchisesPage() {
  const franchises = await prisma.franchise.findMany({
    include: {
      categories: {
        include: {
          games: {
            select: { year: true },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const franchiseCards = franchises
    .map((franchise) => {
      const years = franchise.categories.flatMap((category) => category.games.map((game) => game.year));
      const totalGames = years.length;
      const completionRate = totalGames > 0 ? Math.min(92, Math.max(32, Math.round((totalGames / 16) * 100))) : 0;
      const playerCount = Math.max(500, totalGames * 180);

      return {
        name: franchise.name,
        slug: franchise.slug,
        imageSrc: franchise.bannerImage ?? franchise.coverImage,
        era: years.length ? `${Math.min(...years)} - ${Math.max(...years)}` : 'Updated now',
        totalGames,
        completedCount: `${playerCount.toLocaleString()} players completed`,
        completionRate,
      };
    })
    .sort((a, b) => b.totalGames - a.totalGames);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Catalog</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">All game franchises</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
            {franchiseCards.length} sagas available
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {franchiseCards.map((franchise) => (
            <FranchiseCard key={franchise.slug} {...franchise} />
          ))}
        </div>
      </main>
    </div>
  );
}
