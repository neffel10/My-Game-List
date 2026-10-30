import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Download, Ticket } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';

export default async function MyRewardsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/profile');

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { userId },
    include: {
      reward: true,
      digitalCode: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/rewards" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Rewards catalog
        </Link>
        <h1 className="text-3xl font-bold text-white">My digital rewards</h1>
        <p className="mt-2 text-sm text-zinc-400">Your redeemed downloads and digital codes are private to your account.</p>

        {redemptions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-zinc-900/60 p-10 text-center text-zinc-400">
            You have not redeemed any rewards yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {redemptions.map((redemption) => (
              <article key={redemption.id} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Redeemed {redemption.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-white">{redemption.reward.title}</h2>
                    <p className="text-sm text-zinc-400">{redemption.pointsSpent} points · {redemption.reward.company}</p>
                  </div>
                  {redemption.reward.deliveryType === 'DIGITAL_DOWNLOAD' ? (
                    <a
                      href={`/api/rewards/${redemption.id}/download`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      <Download className="h-4 w-4" />
                      Download file
                    </a>
                  ) : redemption.digitalCode ? (
                    <div className="min-w-0 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs text-emerald-200">
                        <Ticket className="h-4 w-4" />
                        Your personal code
                      </div>
                      <code className="break-all font-mono text-sm text-white">{redemption.digitalCode.code}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-red-200">Delivery details are unavailable. Contact an administrator.</p>
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
