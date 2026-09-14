import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FeaturedFanArt from '@/components/home/FeaturedFanArt';
import FranchiseCard from '@/components/home/FranchiseCard';
import { prisma } from '@/lib/prisma';
import { Flame, Clock, ShieldCheck, Gift, Sparkles, ArrowRight } from 'lucide-react';

function getEraLabel(years: number[]) {
  if (years.length === 0) return 'Updated now';
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? `${min}` : `${min} - ${max}`;
}

export default async function HomePage() {
  const [franchises, featuredFanArt, rewards] = await Promise.all([
    prisma.franchise.findMany({
      include: {
        categories: {
          include: {
            games: {
              select: {
                year: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.fanArtSubmission.findFirst({
      where: { isFeatured: true, isActive: true },
      include: { franchise: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsRequired: 'asc' },
      take: 3,
    }),
  ]);

  const mappedFranchises = franchises
    .map((franchise) => {
      const years = franchise.categories.flatMap((category) => category.games.map((game) => game.year));
      const totalGames = years.length;
      const completionRate = totalGames > 0 ? Math.min(92, Math.max(32, Math.round((totalGames / 16) * 100))) : 0;
      const playerCount = Math.max(500, totalGames * 180);

      return {
        name: franchise.name,
        slug: franchise.slug,
        imageSrc: franchise.bannerImage ?? franchise.coverImage,
        era: getEraLabel(years),
        totalGames,
        completedCount: `${playerCount.toLocaleString()} players completed`,
        completionRate,
      };
    })
    .sort((a, b) => b.totalGames - a.totalGames)
    .slice(0, 4);

  const featuredFranchise =
    mappedFranchises.find((franchise) => franchise.slug === 'pokemon') ?? mappedFranchises[0] ?? null;

  const featuredDisplay = featuredFanArt
    ? {
        imageSrc: featuredFanArt.imageUrl,
        franchiseName: featuredFanArt.franchise?.name ?? featuredFranchise?.name ?? 'Featured franchise',
        artistName: featuredFanArt.artistName,
        franchiseSlug: featuredFanArt.franchise?.slug ?? featuredFranchise?.slug ?? '#',
        totalGames: featuredFranchise?.totalGames ?? 0,
      }
    : featuredFranchise
      ? {
          imageSrc: featuredFranchise.imageSrc,
          franchiseName: featuredFranchise.name,
          artistName: '@CommunityArt',
          franchiseSlug: featuredFranchise.slug,
          totalGames: featuredFranchise.totalGames,
        }
      : null;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#0e1320] to-[#07090e] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                  <Sparkles className="h-3.5 w-3.5 text-zinc-100" />
                  <span>Monthly Fan Art Showcase & Real Rewards</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
                  Track your game sagas. <br />
                  <span className="text-zinc-400 font-normal">Prove it. Earn real loot.</span>
                </h1>

                <p className="max-w-xl text-base text-zinc-400 leading-relaxed">
                  Log your completed titles across entire franchises, submit your in-game screenshots as proof,
                  earn completion points, and unlock rewards through verified milestones.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/franchises"
                    className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                  >
                    Start Your Checklist
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/franchises"
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition"
                  >
                    Explore Franchises
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/[0.06] max-w-md">
                  <div>
                    <div className="text-xl font-bold text-white">{franchises.length}</div>
                    <div className="text-xs text-zinc-500">Active sagas</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">100%</div>
                    <div className="text-xs text-zinc-500">Verified proofs</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">Monthly</div>
                    <div className="text-xs text-zinc-500">Prize drops</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                {featuredDisplay && (
                  <FeaturedFanArt
                    imageSrc={featuredDisplay.imageSrc}
                    franchiseName={featuredDisplay.franchiseName}
                    artistName={featuredDisplay.artistName}
                    franchiseSlug={featuredDisplay.franchiseSlug}
                    totalGames={featuredDisplay.totalGames}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-12">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-white" />
                    <h2 className="text-xl font-bold tracking-tight text-white">Popular Franchises</h2>
                  </div>
                  <Link href="/franchises" className="text-xs font-medium text-zinc-400 transition hover:text-white">
                    View all sagas →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {mappedFranchises.map((franchise) => (
                    <FranchiseCard key={franchise.slug} {...franchise} />
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-white" />
                  <h2 className="text-xl font-bold tracking-tight text-white">Recent Proof Submissions</h2>
                </div>

                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  {[
                    { user: 'Valkyrie99', game: 'Pokémon Sword', franchise: 'Pokémon', time: '12m ago', points: '+150 pts' },
                    { user: 'CyberWolf', game: 'Resident Evil 7', franchise: 'Resident Evil', time: '34m ago', points: '+200 pts' },
                    { user: 'Solidus', game: 'Metal Gear Solid 3: Snake Eater', franchise: 'Metal Gear Solid', time: '1h ago', points: '+180 pts' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 font-semibold text-xs border border-white/10">
                          {activity.user.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            <span className="text-zinc-400">@{activity.user}</span> completed{' '}
                            <span className="text-white">{activity.game}</span>
                          </p>
                          <p className="text-[11px] text-zinc-500">Franchise: {activity.franchise}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          {activity.points}
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4 space-y-8">
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6">
                <div className="flex items-center gap-2 text-white">
                  <Gift className="h-5 w-5" />
                  <h3 className="font-semibold text-sm tracking-tight">Active Rewards Pool</h3>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Top point earners this month receive gaming merchandise, figurines, and official game keys.
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  {rewards.length > 0 ? (
                   rewards.map((reward) => (
                     <div key={reward.id} className="flex justify-between gap-3 py-1.5 border-b border-white/[0.05]">
                       <span className="text-zinc-400">{reward.pointsRequired} pts</span>
                       <span className="font-semibold text-white text-right">{reward.title}</span>
                     </div>
                   ))
                  ) : (
                   <>
                     <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                       <span className="text-zinc-400">Tier 1</span>
                       <span className="font-semibold text-white">Collector figure</span>
                     </div>
                     <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                       <span className="text-zinc-400">Tier 2</span>
                       <span className="font-semibold text-white">Mug + Steam card</span>
                     </div>
                     <div className="flex justify-between py-1.5">
                       <span className="text-zinc-400">Tier 3</span>
                       <span className="font-semibold text-white">Digital game key</span>
                     </div>
                   </>
                  )}
                </div>
                <Link
                  href="/rewards"
                  className="mt-5 block w-full rounded-lg border border-white/10 bg-white/5 py-2 text-center text-xs font-medium text-white hover:bg-white/10 transition"
                >
                  View Rewards Rules
                </Link>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold tracking-tight">Latest Sagas Added</h3>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {mappedFranchises.map((item) => (
                    <div key={item.slug} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <Link href={`/franchises/${item.slug}`} className="font-medium text-zinc-200 hover:text-white transition">
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-zinc-500">{item.totalGames} games</p>
                      </div>
                      <span className="text-[11px] text-zinc-500">Live</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/franchises"
                  className="block text-center text-xs text-zinc-400 hover:text-white pt-2 border-t border-white/[0.05]"
                >
                  + Explore all sagas
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#07090e] py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MyGameList. All game trademarks and fan art belong to their respective creators.</p>
          <div className="flex gap-6">
            <Link href="/franchises" className="hover:text-zinc-400">Franchises</Link>
            <Link href="/profile" className="hover:text-zinc-400">Profile</Link>
            <Link href="/admin/content" className="hover:text-zinc-400">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
