import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImageIcon, Gift, Sparkles, ArrowLeft, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n-server';
import { translate } from '@/lib/i18n';
import ImportTaskProgress from '@/components/admin/ImportTaskProgress';
import ImportTaskHistoryCard from '@/components/admin/ImportTaskHistoryCard';
import AdminContestCreateForm from '@/components/admin/AdminContestCreateForm';
import RewardAdminCard from '@/components/admin/RewardAdminCard';
import { AdminHubPanel, AdminHubTabs } from '@/components/admin/AdminHubTabs';
import {
  saveFranchiseFanArt,
  saveReward,
  createFranchise,
  toggleFanArtStatus,
} from '@/app/actions/content-admin';
import {
  approveContestFanArt,
  closeFanArtContest,
  rejectContestFanArt,
} from '@/app/actions/fan-art';
import ImageLightbox from '@/components/shared/ImageLightbox';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

interface AdminContentPageProps {
  searchParams: Promise<{
    error?: string;
    name?: string;
    imported?: string;
    games?: string;
    task?: string;
    retry?: string;
    banner?: string;
    message?: string;
  }>;
}

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const t = (phrase: string) => translate(locale, phrase);

  const isAdmin = ADMIN_BYPASS_ENABLED || (!!session?.user && !!userEmail && ADMIN_EMAILS.includes(userEmail));

  if (!isAdmin) {
    redirect('/');
  }

  const [franchises, featuredArt, submissions, rewards, activeImportTasks, completedImportTasks, hiddenImportTasks, openFanArtContest, pendingContestArt] = await Promise.all([
    prisma.franchise.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.fanArtSubmission.findFirst({
      where: { isFeatured: true, isActive: true },
      include: { franchise: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fanArtSubmission.findMany({
      where: { isActive: true },
      include: { franchise: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reward.findMany({
      where: { deliveryType: { in: ['DIGITAL_DOWNLOAD', 'DIGITAL_CODE'] } },
      orderBy: { pointsRequired: 'asc' },
    }),
    prisma.importTask.findMany({
      where: { status: { in: ['PENDING', 'RUNNING', 'FAILED'], }, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.importTask.findMany({
      where: { status: 'COMPLETED', isHidden: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.importTask.findMany({
      where: { status: { in: ['COMPLETED', 'FAILED'] }, isHidden: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.fanArtContest.findFirst({
      where: { status: 'OPEN' },
      include: {
        franchise: true,
        submissions: {
          where: { reviewStatus: 'APPROVED', isActive: true },
          include: { _count: { select: { votes: true } } },
          orderBy: [{ votes: { _count: 'desc' } }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fanArtSubmission.findMany({
      where: { contestId: { not: null }, reviewStatus: 'PENDING' },
      include: {
        franchise: true,
        submittedBy: { select: { gamertag: true, email: true } },
        contest: { select: { month: true, year: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/profile" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              {t('Back to profile')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('Content management')}</h1>
          </div>
          <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
            {t('Admin hub')}
          </div>
          <Link href="/admin/evidence" className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/15">
            {t('Review evidence')}
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <Sparkles className="h-4 w-4 text-violet-300" />
              {t('Featured art')}
            </div>
            <div className="text-3xl font-bold text-white">{featuredArt ? '1' : '0'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ImageIcon className="h-4 w-4 text-amber-300" />
              {t('Franchises art')}
            </div>
            <div className="text-3xl font-bold text-white">{submissions.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <Gift className="h-4 w-4 text-emerald-300" />
              {t('Rewards')}
            </div>
            <div className="text-3xl font-bold text-white">{rewards.length}</div>
          </div>
        </div>

        <AdminHubTabs>
          <AdminHubPanel tab="default">
            <div className="space-y-8">
          {params.task && <ImportTaskProgress taskId={params.task} />}
          {params.retry && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {params.retry} {t('already existed, so its RAWG import was queued again instead of creating a duplicate franchise.')}
            </div>
          )}
          {params.error === 'duplicate-franchise' && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {t('The franchise')} <strong>{params.name ?? t('you entered')}</strong> {t('already exists. Use a different name or manage it from the existing franchise pages.')}
            </div>
          )}
          {params.error === 'rawg-config' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {t('RAWG is not configured in this deployment. Add')} <code>RAWG_API_KEY</code> {t('to the Production environment and redeploy.')}
            </div>
          )}
          {params.error === 'franchise-input' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {t('Enter a franchise name. A banner image is optional.')}
            </div>
          )}
          {params.error === 'franchise-image' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {t('The banner URL could not be imported:')} {params.message ?? t('the remote server rejected the download.')}
              <span className="mt-1 block text-xs text-red-200/80">{t('Use a direct image URL that is publicly downloadable, or upload the file locally.')}</span>
            </div>
          )}
          {params.error === 'invalid-franchise-name' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {t('The franchise name could not be converted into a valid URL.')}
            </div>
          )}
          {params.imported && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {t('Imported')} <strong>{params.imported}</strong> {t('successfully with')} {params.games ?? '0'} {t('games')}.
            </div>
          )}
          {params.banner === 'placeholder' && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {t('The franchise was created successfully with a placeholder banner. You can upload its artwork later.')}
            </div>
          )}
          {activeImportTasks.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">{t('Active import tasks')}</h2>
                <p className="mt-1 text-sm text-zinc-400">{t('Tasks are saved in the database and continue updating if you leave and return to this panel.')}</p>
              </div>
              <div className="space-y-3">
                {activeImportTasks.map((task) => <ImportTaskProgress key={task.id} taskId={task.id} />)}
              </div>
            </section>
          )}
          {completedImportTasks.length > 0 && (
            <details className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
              <summary className="cursor-pointer list-none text-xl font-bold text-white">
                {t('Completed import history')} ({completedImportTasks.length})
              </summary>
              <p className="mt-1 text-sm text-zinc-400">{t('Completed tasks are kept here so the active task area stays uncluttered.')}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {completedImportTasks.map((task) => <ImportTaskHistoryCard key={task.id} task={task} />)}
              </div>
            </details>
          )}
          {hiddenImportTasks.length > 0 && (
            <details className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
              <summary className="cursor-pointer list-none text-lg font-semibold text-zinc-300">
                {t('Hidden import logs')} ({hiddenImportTasks.length})
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {hiddenImportTasks.map((task) => <ImportTaskHistoryCard key={task.id} task={task} />)}
              </div>
            </details>
          )}
            </div>
          </AdminHubPanel>

          <AdminHubPanel tab="fan-art">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">{t('Monthly fan art contest')}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t('Run one franchise contest at a time. Closing voting publishes the leader as featured art until the next winner; ties go to the earliest-submitted approved entry. With no votes, the current featured art stays.')}</p>
            </div>
            {openFanArtContest ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t('Voting open')} · {openFanArtContest.month} {openFanArtContest.year}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{openFanArtContest.franchise.name}</h3>
                    <p className="text-xs text-zinc-400">{openFanArtContest.submissions.length} {t('approved entries')}</p>
                    <p className="mt-2 max-w-2xl text-xs text-zinc-500">{t('Only one contest can be open at a time, and each calendar month can have one franchise contest. Close this one before opening the next month.')}</p>
                  </div>
                  <form action={closeFanArtContest.bind(null, openFanArtContest.id)}>
                    <button type="submit" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15">
                      {t('Close voting & feature winner')}
                    </button>
                  </form>
                </div>
                {openFanArtContest.submissions.length > 0 ? (
                  <ol className="mt-4 space-y-2">
                    {openFanArtContest.submissions.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                        <span className="text-zinc-200">{entry.title} · {entry.artistName}</span>
                        <span className="shrink-0 text-zinc-400">{entry._count.votes} votes</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">{t('There are no approved entries yet. You can close the poll without changing the current featured art.')}</p>
                )}
              </div>
            ) : <AdminContestCreateForm franchises={franchises} />}
          </section>

          {pendingContestArt.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">{t('Fan art submissions awaiting review')}</h2>
                <p className="mt-1 text-sm text-zinc-400">{t('Approve original, relevant entries before they appear in the public vote.')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingContestArt.map((entry) => (
                  <article key={entry.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <ImageLightbox src={entry.imageUrl} alt={entry.title} className="h-52 w-full" sizes="(max-width: 768px) 100vw, 50vw" />
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="font-semibold text-white">{entry.title}</h3>
                        <p className="text-xs text-zinc-400">{entry.submittedBy?.gamertag ?? entry.artistName} · {entry.franchise?.name} · {entry.contest?.month} {entry.contest?.year}</p>
                      </div>
                      {entry.contest?.status === 'OPEN' ? (
                        <div className="flex flex-wrap gap-2">
                          <form action={approveContestFanArt.bind(null, entry.id)}>
                            <button type="submit" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">{t('Approve for voting')}</button>
                          </form>
                          <form action={rejectContestFanArt.bind(null, entry.id)} className="flex min-w-0 flex-1 gap-2">
                            <input name="rejectionReason" required maxLength={500} placeholder={t('Rejection reason')} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white" />
                            <button type="submit" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100">{t('Reject')}</button>
                          </form>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-200">{t('The contest is closed; this entry cannot be approved for voting.')}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          </AdminHubPanel>

          <AdminHubPanel tab="default">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-300" />
              <div>
                <h2 className="text-xl font-bold text-white">{t('Import a franchise')}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {t('Enter a franchise name and RAWG will import its matching games.')}
                </p>
              </div>
            </div>

            <form action={createFranchise} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Franchise name')}
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder={t('For example: Metroid')}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Franchise banner')}
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-2.5 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-200"
                />
                <span className="text-xs text-zinc-500">{t('Maximum size: 3MB. You can use a URL below instead.')}</span>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Banner image URL')}
                <input name="imageUrl" type="url" placeholder="https://example.com/banner.jpg" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-cyan-400" />
                <span className="text-xs text-zinc-500">{t('If the URL cannot be downloaded, the franchise will still be created with a placeholder banner.')}</span>
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  <Plus className="h-4 w-4" />
                  {t('Import a franchise')}
                </button>
              </div>
            </form>
          </section>
          </AdminHubPanel>

          <AdminHubPanel tab="fan-art">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-bold text-white">{t('Franchise fan art library')}</h2>
            </div>

            <form action={saveFranchiseFanArt} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Franchise')}
                <select name="franchiseId" required className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400">
                  <option value="">{t('Select a franchise')}</option>
                  {franchises.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>{franchise.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Artwork title')}
                <input name="title" required placeholder={t('Fan art title')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Artist name')}
                <input name="artistName" required placeholder={t('Artist handle')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  {t('Month')}
                  <input name="month" required placeholder={t('May')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
                </label>

                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  {t('Year')}
                  <input name="year" type="number" min="2024" defaultValue={new Date().getFullYear()} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                {t('Image file')}
                <input type="file" name="image" accept="image/*" required className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500/15 file:px-3 file:py-2 file:text-amber-200" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15">
                  {t('Upload franchise art')}
                </button>
              </div>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {submissions.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <div className="relative h-40 w-full">
                    <ImageLightbox src={item.imageUrl} alt={item.title} className="h-full w-full" sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-zinc-400">{item.franchise?.name ?? 'General'} · {item.artistName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${item.isFeatured ? 'bg-violet-500/15 text-violet-200' : 'bg-zinc-800 text-zinc-300'}`}>
                        {item.isFeatured ? 'Featured' : 'Library'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-500">{item.month} {item.year}</span>
                      <form action={toggleFanArtStatus.bind(null, item.id, !item.isActive)}>
                        <button type="submit" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10">
                          {item.isActive ? 'Hide' : 'Show'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </AdminHubPanel>

          <AdminHubPanel tab="rewards">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-bold text-white">{t('Rewards catalog')}</h2>
            </div>

            <form action={saveReward} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Reward title')}
                <input name="title" required placeholder={t('For example: Collector avatar')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Sponsor / company')}
                <input name="company" required placeholder={t('For example: Nintendo / indie publisher')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Points required')}
                <input name="pointsRequired" type="number" min="50" required defaultValue={250} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                {t('Description')}
                <textarea name="description" rows={3} placeholder={t('Describe the reward and any redemption notes.')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Digital reward type')}
                <select name="deliveryType" defaultValue="DIGITAL_DOWNLOAD" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400">
                  <option value="DIGITAL_DOWNLOAD">{t('Wallpaper / avatar download')}</option>
                  <option value="DIGITAL_CODE">{t('Game / digital code')}</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Available downloads')}
                <input name="stock" type="number" min="1" defaultValue={100} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
                <span className="text-xs text-zinc-500">{t('Only used for downloadable images. Digital code stock is calculated from unused codes.')}</span>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                {t('Reward artwork / preview image')}
                <input type="file" name="image" accept="image/*" required className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/15 file:px-3 file:py-2 file:text-emerald-200" />
                <span className="text-xs text-zinc-500">{t('For image downloads, this is the artwork users receive after redemption. The catalog preview is generated with a watermark.')}</span>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {t('Digital codes (for code rewards, one per line)')}
                <textarea name="digitalCodes" rows={3} maxLength={50000} placeholder={t('One code per line')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-emerald-400" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15">
                  {t('Add reward')}
                </button>
              </div>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {rewards.flatMap((reward) => {
                if (reward.deliveryType !== 'DIGITAL_DOWNLOAD' && reward.deliveryType !== 'DIGITAL_CODE') return [];
                return [<RewardAdminCard key={reward.id} reward={reward} />];
              })}
            </div>
          </section>
          </AdminHubPanel>
        </AdminHubTabs>
      </div>
    </div>
  );
}
