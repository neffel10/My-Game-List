import Link from 'next/link';
import { auth } from '@/auth';
import Navbar from '@/components/layout/Navbar';
import { prisma } from '@/lib/prisma';
import FanArtContest from '@/components/fan-art/FanArtContest';
import ImageLightbox from '@/components/shared/ImageLightbox';

export default async function FanArtPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [contest, fanArts, mySubmissions] = await Promise.all([
    prisma.fanArtContest.findFirst({
      where: { status: 'OPEN' },
      include: {
        franchise: { select: { name: true } },
        submissions: {
          where: { isActive: true, reviewStatus: 'APPROVED' },
          include: {
            _count: { select: { votes: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fanArtSubmission.findMany({
      where: {
        isActive: true,
        reviewStatus: 'APPROVED',
      },
      include: {
        franchise: true,
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    userId
      ? prisma.fanArtSubmission.findMany({
          where: { submittedByUserId: userId, contestId: { not: null } },
          select: {
            id: true,
            title: true,
            reviewStatus: true,
            rejectionReason: true,
            month: true,
            year: true,
            contest: { select: { status: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : Promise.resolve([]),
  ]);
  const userVote = contest && userId
    ? await prisma.fanArtVote.findUnique({
        where: { contestId_userId: { contestId: contest.id, userId } },
        select: { submissionId: true },
      })
    : null;
  const pastFanArts = fanArts.filter((item) => item.contestId !== contest?.id);
  const contestVotes = contest?.submissions.reduce((total, submission) => total + submission._count.votes, 0) ?? 0;
  const userVoteId = userVote?.submissionId ?? null;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Fan Art</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Monthly community art</h1>
          </div>
          <Link href="/franchises" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Explore franchises
          </Link>
        </div>

        {contest && (
          <FanArtContest
            userId={userId}
            contest={{
              id: contest.id,
              franchiseName: contest.franchise.name,
              month: contest.month,
              year: contest.year,
              totalVotes: contestVotes,
              userVoteId,
              submissions: contest.submissions.map((submission) => ({
                id: submission.id,
                title: submission.title,
                artistName: submission.artistName,
                imageUrl: submission.imageUrl,
                voteCount: submission._count.votes,
              })),
            }}
          />
        )}

        {mySubmissions.length > 0 && (
          <section className="mb-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="text-lg font-bold text-white">Your contest submissions</h2>
            <div className="mt-3 space-y-2">
              {mySubmissions.map((submission) => (
                <div key={submission.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm">
                  <span className="text-zinc-200">{submission.title} · {submission.month} {submission.year}</span>
                  <span title={submission.rejectionReason ?? undefined} className={`text-xs ${submission.reviewStatus === 'APPROVED' ? 'text-emerald-300' : submission.reviewStatus === 'REJECTED' ? 'cursor-help text-red-300 underline decoration-dotted' : 'text-amber-300'}`}>
                    {submission.reviewStatus === 'APPROVED' ? 'Approved for voting' : submission.reviewStatus === 'REJECTED' ? 'Not approved · hover for details' : 'Pending review'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5">
          <h2 className="text-xl font-bold text-white">Featured and past community art</h2>
          <p className="mt-1 text-sm text-zinc-400">Winning art remains featured until a later contest winner replaces it.</p>
        </div>
        {pastFanArts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No approved community art has been published yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pastFanArts.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl">
                <ImageLightbox src={item.imageUrl} alt={item.title} className="h-72 w-full bg-zinc-800" imageClassName="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
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
                    {item.contestId ? ` · ${item._count.votes} votes` : ''}
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
