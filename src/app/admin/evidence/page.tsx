import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ImageIcon, ShieldAlert, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  approveEvidenceSubmission,
  rejectEvidenceSubmission,
} from '@/app/actions/evidence';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

export default async function AdminEvidencePage() {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();

  const isAdmin = ADMIN_BYPASS_ENABLED || (!!session?.user && !!userEmail && ADMIN_EMAILS.includes(userEmail));

  if (!isAdmin) {
    redirect('/');
  }

  const reviewableEvidence = await prisma.evidenceSubmission.findMany({
    where: { status: { in: ['PENDING', 'APPROVED'] } },
    include: {
      user: true,
      progress: {
        include: {
          game: {
            include: {
              pointAwards: true,
              subcategory: {
                include: {
                  franchise: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/profile"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Evidence moderation</h1>
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200">
            Admin queue
          </div>
        </div>

        <div className="mb-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ImageIcon className="h-4 w-4" />
              Pending
            </div>
            <div className="text-3xl font-bold text-white">{reviewableEvidence.filter((evidence) => evidence.status === 'PENDING').length}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified
            </div>
            <div className="text-3xl font-bold text-white">
              {await prisma.pointAward.count({ where: { creditedAt: { not: null } } })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Review checklist
            </div>
            <div className="text-sm text-zinc-300">
              Look for username, paper proof, in-game name, or a visible camera frame.
            </div>
          </div>
        </div>

        {reviewableEvidence.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            No evidence needs review or a mastery update.
          </div>
        ) : (
          <div className="space-y-6">
            {reviewableEvidence.map((submission) => {
              const game = submission.progress.game;
              const franchise = game.subcategory.franchise;
              const baseAwarded = game.pointAwards.some((award) => award.userId === submission.userId && award.type === 'GAME_COMPLETED');
              const masteryAwarded = game.pointAwards.some((award) => award.userId === submission.userId && award.type === 'GAME_MASTERED_BONUS');

              return (
                <div
                  key={submission.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl"
                >
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      <div className="relative h-72 w-full overflow-hidden">
                        <Image
                          src={submission.imageUrl}
                          alt={`${submission.user.gamertag} proof for ${game.title}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 720px"
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                          {submission.status === 'PENDING' ? 'Submitted by' : 'Approved evidence · mastery can be updated'}
                        </div>
                        <h2 className="text-2xl font-bold text-white">{submission.user.gamertag}</h2>
                        <p className="text-sm text-zinc-300">{submission.user.email}</p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Game</div>
                        <div className="mt-2 text-lg font-semibold text-white">{game.title}</div>
                        <div className="text-sm text-zinc-400">{franchise.name}</div>
                      </div>

                      <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-sm">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-200">Reward history for this game</div>
                        <p className="text-zinc-200">
                          {baseAwarded
                            ? '✓ 100 completion points already awarded'
                            : '100 completion points will be awarded once approved'}
                        </p>
                        <p className="mt-1 text-zinc-300">
                          {masteryAwarded
                            ? '✓ 50 mastery bonus already awarded'
                            : '50 mastery bonus available if 100% is confirmed'}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">A game can only receive each reward once.</p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Validation checklist
                        </div>
                        <ul className="space-y-2">
                          <li>• Confirm the user is visible in the capture.</li>
                          <li>• Verify the gamertag, username, or paper proof is readable.</li>
                          <li>• Check the screenshot matches the completion status requested.</li>
                        </ul>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Review decision</div>
                        <form action={approveEvidenceSubmission.bind(null, submission.id)} className="space-y-3">
                          <label className="flex items-start gap-2 text-sm text-zinc-200">
                            <input
                              name="masteredApproved"
                              type="checkbox"
                              defaultChecked={submission.masteredApproved}
                              className="mt-0.5 h-4 w-4 accent-emerald-400"
                            />
                            <span>
                              Confirm 100% mastery
                              <span className="block text-xs text-zinc-400">
                                Adds 50 points only. If completion points were not awarded yet, the normal 100 points are also included.
                              </span>
                            </span>
                          </label>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15 cursor-pointer"
                          >
                            {submission.status === 'APPROVED' ? 'Save approval / mastery' : 'Approve evidence'}
                          </button>
                        </form>

                        {submission.status === 'PENDING' && (
                          <form action={rejectEvidenceSubmission.bind(null, submission.id)} className="mt-4 space-y-2 border-t border-white/10 pt-4">
                            <label className="block text-xs font-medium text-zinc-300" htmlFor={`reject-reason-${submission.id}`}>Reason shown to the player</label>
                            <textarea
                              id={`reject-reason-${submission.id}`}
                              name="rejectionReason"
                              required
                              maxLength={500}
                              rows={2}
                              placeholder="Explain what needs to be visible or corrected."
                              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/15 cursor-pointer"
                            >
                              Reject evidence
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
