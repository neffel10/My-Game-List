'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { voteForFanArt, submitFanArt } from '@/app/actions/fan-art';
import ImageLightbox from '@/components/shared/ImageLightbox';

interface ContestSubmission {
  id: string;
  title: string;
  artistName: string;
  imageUrl: string;
  voteCount: number;
}

interface FanArtContestProps {
  contest: {
    id: string;
    franchiseName: string;
    month: string;
    year: number;
    submissions: ContestSubmission[];
    totalVotes: number;
    userVoteId: string | null;
  };
  userId: string | null;
}

export default function FanArtContest({ contest, userId }: FanArtContestProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setPending(true);
    setMessage(null);
    const result = await submitFanArt(formData);
    setMessage('error' in result ? result.error ?? 'Artwork could not be submitted.' : 'Submission received. It will appear for voting after admin review.');
    setPending(false);
    if ('success' in result) router.refresh();
  };

  const handleVote = async (submissionId: string) => {
    setPending(true);
    setMessage(null);
    const result = await voteForFanArt(contest.id, submissionId);
    if ('error' in result) setMessage(result.error ?? 'Your vote could not be recorded.');
    else router.refresh();
    setPending(false);
  };

  return (
    <section className="mb-10 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Monthly community contest · {contest.month} {contest.year}</p>
          <h2 className="mt-1 text-2xl font-bold text-white">{contest.franchiseName} fan art</h2>
          <p className="mt-2 text-sm text-zinc-400">Vote once for your favorite approved entry. Live results are public; ties go to the earliest-submitted approved entry.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-300">
          {contest.totalVotes} {contest.totalVotes === 1 ? 'vote' : 'votes'}
        </div>
      </div>

      {userId ? (
        <details className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-white">Submit your fan art</summary>
          <form action={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="contestId" value={contest.id} />
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Artwork title
              <input name="title" required minLength={2} maxLength={100} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Image (max 3MB)
              <input name="image" type="file" accept="image/png,image/jpeg,image/webp" required className="rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
            </label>
            <label className="flex items-start gap-2 text-xs text-zinc-400 sm:col-span-2">
              <input name="rightsConfirmed" type="checkbox" required className="mt-0.5 accent-white" />
              I created this artwork or have permission to submit it, and I agree it may be displayed in the community contest.
            </label>
            <button type="submit" disabled={pending} className="w-fit rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50">
              {pending ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
        </details>
      ) : (
        <p className="mt-5 text-sm text-zinc-400">Sign in to submit artwork or vote in this contest.</p>
      )}

      {message && <p role="status" className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200">{message}</p>}

      {contest.submissions.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
          Entries will appear here after admin review.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {contest.submissions.map((submission) => {
            const percentage = contest.totalVotes > 0
              ? Math.round((submission.voteCount / contest.totalVotes) * 100)
              : 0;
            const isSelected = contest.userVoteId === submission.id;

            return (
              <article key={submission.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <ImageLightbox
                  src={submission.imageUrl}
                  alt={submission.title}
                  className="h-56 w-full"
                  imageClassName="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-semibold text-white">{submission.title}</h3>
                    <p className="text-xs text-zinc-400">by {submission.artistName}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-zinc-400">
                      <span>{submission.voteCount} {submission.voteCount === 1 ? 'vote' : 'votes'}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-violet-300 transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  {userId && !contest.userVoteId ? (
                    <button type="button" disabled={pending} onClick={() => handleVote(submission.id)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                      {pending ? 'Saving vote...' : 'Vote for this art'}
                    </button>
                  ) : isSelected ? (
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-center text-sm font-medium text-emerald-200">Your vote</div>
                  ) : (
                    <div className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs text-zinc-500">
                      {contest.userVoteId ? 'You already voted in this contest' : 'Sign in to vote'}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
