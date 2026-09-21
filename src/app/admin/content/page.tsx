import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImageIcon, Gift, Sparkles, ArrowLeft, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ImportTaskProgress from '@/components/admin/ImportTaskProgress';
import {
  saveFeaturedFanArt,
  saveFranchiseFanArt,
  saveReward,
  createFranchise,
  toggleFanArtStatus,
  toggleRewardStatus,
} from '@/app/actions/content-admin';

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
  }>;
}

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase();
  const params = await searchParams;

  const isAdmin = ADMIN_BYPASS_ENABLED || (!!session?.user && !!userEmail && ADMIN_EMAILS.includes(userEmail));

  if (!isAdmin) {
    redirect('/');
  }

  const [franchises, featuredArt, submissions, rewards, activeImportTasks, completedImportTasks] = await Promise.all([
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
      where: { isActive: true },
      orderBy: { pointsRequired: 'asc' },
    }),
    prisma.importTask.findMany({
      where: { status: { in: ['PENDING', 'RUNNING', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.importTask.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/profile" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Content management</h1>
          </div>
          <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
            Admin hub
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <Sparkles className="h-4 w-4 text-violet-300" />
              Featured art
            </div>
            <div className="text-3xl font-bold text-white">{featuredArt ? '1' : '0'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <ImageIcon className="h-4 w-4 text-amber-300" />
              Franchises art
            </div>
            <div className="text-3xl font-bold text-white">{submissions.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <Gift className="h-4 w-4 text-emerald-300" />
              Rewards
            </div>
            <div className="text-3xl font-bold text-white">{rewards.length}</div>
          </div>
        </div>

        <div className="space-y-8">
          {params.task && <ImportTaskProgress taskId={params.task} />}
          {params.retry && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {params.retry} already existed, so its RAWG import was queued again instead of creating a duplicate franchise.
            </div>
          )}
          {params.error === 'duplicate-franchise' && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              The franchise <strong>{params.name ?? 'you entered'}</strong> already exists. Use a different name or manage it from the existing franchise pages.
            </div>
          )}
          {params.error === 'rawg-config' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              RAWG is not configured in this deployment. Add <code>RAWG_API_KEY</code> to the Production environment and redeploy.
            </div>
          )}
          {params.error === 'franchise-input' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Enter a franchise name and select a banner image before importing.
            </div>
          )}
          {params.error === 'invalid-franchise-name' && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              The franchise name could not be converted into a valid URL.
            </div>
          )}
          {params.imported && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Imported <strong>{params.imported}</strong> successfully with {params.games ?? '0'} games.
            </div>
          )}
          {activeImportTasks.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Active import tasks</h2>
                <p className="mt-1 text-sm text-zinc-400">Tasks are saved in the database and continue updating if you leave and return to this panel.</p>
              </div>
              <div className="space-y-3">
                {activeImportTasks.map((task) => <ImportTaskProgress key={task.id} taskId={task.id} />)}
              </div>
            </section>
          )}
          {completedImportTasks.length > 0 && (
            <details className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
              <summary className="cursor-pointer list-none text-xl font-bold text-white">
                Completed import history ({completedImportTasks.length})
              </summary>
              <p className="mt-1 text-sm text-zinc-400">Completed tasks are kept here so the active task area stays uncluttered.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {completedImportTasks.map((task) => <ImportTaskProgress key={task.id} taskId={task.id} />)}
              </div>
            </details>
          )}

          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-300" />
              <div>
                <h2 className="text-xl font-bold text-white">Import a franchise</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Enter a franchise name and RAWG will import its matching games.
                </p>
              </div>
            </div>

            <form action={createFranchise} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Franchise name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="For example: Metroid"
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Franchise banner
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-2.5 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-200"
                />
                <span className="text-xs text-zinc-500">Maximum size: 3MB. You can use a URL below instead.</span>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Banner image URL
                <input name="imageUrl" type="url" placeholder="https://example.com/banner.jpg" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-cyan-400" />
                <span className="text-xs text-zinc-500">The image is downloaded and stored in Vercel Blob.</span>
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  <Plus className="h-4 w-4" />
                  Import franchise
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-300" />
              <h2 className="text-xl font-bold text-white">Set fan art of the month</h2>
            </div>

            <form action={saveFeaturedFanArt} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Franchise
                <select name="franchiseId" required className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-violet-400">
                  <option value="">Select a franchise</option>
                  {franchises.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>{franchise.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Artwork title
                <input name="title" required placeholder="Monthly winner title" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-violet-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Artist name
                <input name="artistName" required placeholder="@CommunityArtist" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-violet-400" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  Month
                  <input name="month" required placeholder="April" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-violet-400" />
                </label>

                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  Year
                  <input name="year" type="number" min="2024" defaultValue={new Date().getFullYear()} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-violet-400" />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                Image file
                <input type="file" name="image" accept="image/*" required className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500/15 file:px-3 file:py-2 file:text-violet-200" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15">
                  Save featured fan art
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-bold text-white">Franchise fan art library</h2>
            </div>

            <form action={saveFranchiseFanArt} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Franchise
                <select name="franchiseId" required className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400">
                  <option value="">Select a franchise</option>
                  {franchises.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>{franchise.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Artwork title
                <input name="title" required placeholder="Fan art title" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Artist name
                <input name="artistName" required placeholder="Artist handle" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  Month
                  <input name="month" required placeholder="May" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
                </label>

                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  Year
                  <input name="year" type="number" min="2024" defaultValue={new Date().getFullYear()} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400" />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                Image file
                <input type="file" name="image" accept="image/*" required className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500/15 file:px-3 file:py-2 file:text-amber-200" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15">
                  Upload franchise art
                </button>
              </div>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {submissions.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <div className="relative h-40 w-full">
                    <Image src={item.imageUrl} alt={item.title} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
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

          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-bold text-white">Rewards catalog</h2>
            </div>

            <form action={saveReward} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Reward title
                <input name="title" required placeholder="Collector statue" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Sponsor / company
                <input name="company" required placeholder="Nintendo / Indie publisher" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Points required
                <input name="pointsRequired" type="number" min="50" required defaultValue={250} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Stock
                <input name="stock" type="number" min="1" defaultValue={1} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                Description
                <textarea name="description" rows={3} placeholder="What users earn, condition, and notes." className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                Reward type
                <select name="category" defaultValue="PHYSICAL" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400">
                  <option value="PHYSICAL">Physical</option>
                  <option value="DIGITAL">Digital</option>
                  <option value="MERCH">Merch</option>
                  <option value="VIP">VIP / Access</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                External link (optional)
                <input name="externalLink" placeholder="https://..." className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                Image file
                <input type="file" name="image" accept="image/*" required className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/15 file:px-3 file:py-2 file:text-emerald-200" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15">
                  Add reward
                </button>
              </div>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {rewards.map((reward) => (
                <div key={reward.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <div className="relative h-32 w-full">
                    <Image src={reward.imageUrl} alt={reward.title} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{reward.title}</p>
                        <p className="text-xs text-zinc-400">{reward.company}</p>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                        {reward.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                      <span>{reward.pointsRequired} pts</span>
                      <span>Stock: {reward.stock}</span>
                    </div>
                    <form action={toggleRewardStatus.bind(null, reward.id, !reward.isActive)}>
                      <button type="submit" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10">
                        {reward.isActive ? 'Hide' : 'Show'}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
