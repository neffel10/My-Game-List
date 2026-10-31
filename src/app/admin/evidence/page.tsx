import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ImageIcon, ShieldAlert, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  approveEvidenceSubmission,
  rejectEvidenceSubmission,
} from '@/app/actions/evidence';
import ImageLightbox from '@/components/shared/ImageLightbox';
import { getLocale } from '@/lib/i18n-server';
import { translate } from '@/lib/i18n';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

export default async function AdminEvidencePage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const t = (phrase: string) => translate(locale, phrase);
  const userEmail = session?.user?.email?.toLowerCase();

  const isAdmin = ADMIN_BYPASS_ENABLED || (!!session?.user && !!userEmail && ADMIN_EMAILS.includes(userEmail));

  if (!isAdmin) {
    redirect('/');
  }

  const reviewableEvidence = await prisma.evidenceSubmission.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        { status: 'APPROVED', masteryRequested: true, masteredApproved: false },
      ],
    },
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
              {t('Back to profile')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('Evidence moderation')}</h1>
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200">
            {t('Admin queue')}
          </div>
        </div>

        <div className="mb-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ImageIcon className="h-4 w-4" />
              {t('Pending')}
            </div>
            <div className="text-3xl font-bold text-white">{reviewableEvidence.filter((evidence) => evidence.status === 'PENDING').length}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              {t('Verified')}
            </div>
            <div className="text-3xl font-bold text-white">
              {await prisma.pointAward.count({ where: { creditedAt: { not: null } } })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              {t('Review checklist')}
            </div>
            <div className="text-sm text-zinc-300">
              {t('Look for username, paper proof, in-game name, or a visible camera frame.')}
            </div>
          </div>
        </div>

        {reviewableEvidence.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            {t('No evidence needs review or a mastery update.')}
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
                      <ImageLightbox
                        src={submission.imageUrl}
                        alt={`${t('Evidence from')} ${submission.user.gamertag} ${t('for')} ${game.title}`}
                        className="h-72 w-full"
                        imageClassName="object-contain"
                        sizes="(max-width: 1024px) 100vw, 720px"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                          {submission.status === 'PENDING' ? t('Submitted by') : t('Completion points auto-awarded · mastery review pending')}
                        </div>
                        <h2 className="text-2xl font-bold text-white">{submission.user.gamertag}</h2>
                        <p className="text-sm text-zinc-300">{submission.user.email}</p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t('Game')}</div>
                        <div className="mt-2 text-lg font-semibold text-white">{game.title}</div>
                        <div className="text-sm text-zinc-400">{franchise.name}</div>
                        <div className="mt-2 inline-flex rounded-full border border-white/15 bg-[#FED140]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FED140]">
                          {submission.masteryRequested ? t('100% mastery proof') : t('Completion proof')}
                        </div>
                      </div>

                      <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-sm">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-200">{t('Reward history for this game')}</div>
                        <p className="text-zinc-200">
                          {baseAwarded
                            ? t('✓ 100 completion points already awarded')
                            : t('100 completion points will be awarded once approved')}
                        </p>
                        <p className="mt-1 text-zinc-300">
                          {masteryAwarded
                            ? t('✓ 50 mastery bonus already awarded')
                            : t('50 mastery bonus available if 100% is confirmed')}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">{t('A game can only receive each reward once.')}</p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                          {t('Validation checklist')}
                        </div>
                        <ul className="space-y-2">
                          <li>{t('• Confirm the user is visible in the capture.')}</li>
                          <li>{t('• Verify the gamertag, username, or paper proof is readable.')}</li>
                          <li>{t('• Check the screenshot matches the completion status requested.')}</li>
                        </ul>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">{t('Review decision')}</div>
                        {submission.status === 'PENDING' && (
                          <p className="mb-3 text-xs text-zinc-400">
                            {t('If this submission is not reviewed within 72 hours, the 100 completion points are awarded automatically. The 50-point mastery bonus always requires manual approval.')}
                          </p>
                        )}
                        <form action={approveEvidenceSubmission.bind(null, submission.id)} className="space-y-3">
                          <label className="flex items-start gap-2 text-sm text-zinc-200">
                            <input
                              name="masteredApproved"
                              type="checkbox"
                              defaultChecked={submission.masteredApproved}
                              disabled={!submission.masteryRequested || masteryAwarded}
                              className="mt-0.5 h-4 w-4 accent-emerald-400"
                            />
                            <span>
                              {t('Confirm 100% mastery')}
                              <span className="block text-xs text-zinc-400">
                                {masteryAwarded
                                  ? t('The 50-point mastery bonus has already been awarded.')
                                  : submission.masteryRequested
                                    ? t('Adds 50 points after confirmation; any unawarded 100 completion points are granted at the same time.')
                                    : t('The player must upload a separate 100% mastery proof before this bonus can be approved.')}
                              </span>
                            </span>
                          </label>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15 cursor-pointer"
                          >
                            {submission.status === 'APPROVED' ? t('Save approval / mastery') : t('Approve evidence')}
                          </button>
                        </form>

                        {submission.status === 'PENDING' && (
                          <form action={rejectEvidenceSubmission.bind(null, submission.id)} className="mt-4 space-y-2 border-t border-white/10 pt-4">
                            <label className="block text-xs font-medium text-zinc-300" htmlFor={`reject-reason-${submission.id}`}>{t('Reason shown to the player')}</label>
                            <textarea
                              id={`reject-reason-${submission.id}`}
                              name="rejectionReason"
                              required
                              maxLength={500}
                              rows={2}
                              placeholder={t('Explain what needs to be visible or corrected.')}
                              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/15 cursor-pointer"
                            >
                              {t('Reject evidence')}
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
