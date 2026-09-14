import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

interface FranchiseCardProps {
  name: string;
  slug: string;
  imageSrc: string;
  era: string;
  totalGames: number;
  completedCount: string;
  completionRate: number;
}

export default function FranchiseCard({
  name,
  slug,
  imageSrc,
  era,
  totalGames,
  completedCount,
  completionRate,
}: FranchiseCardProps) {
  return (
    <Link
      href={`/franchises/${slug}`}
      className="group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 transition-all duration-300 hover:border-white/25 hover:shadow-2xl hover:shadow-black/60"
    >
      {/* Background Image Banner */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-zinc-900">
        <Image
          src={imageSrc}
          alt={`${name} franchise artwork`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Gradients to guarantee text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-transparent" />
      </div>

      {/* Top Meta Badges */}
      <div className="relative z-10 flex items-center justify-between p-5">
        <span className="rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-md">
          {era}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-400 backdrop-blur-md transition-all duration-300 group-hover:border-white/30 group-hover:bg-white group-hover:text-black">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      {/* Bottom Content & Stats */}
      <div className="relative z-10 flex flex-col justify-end p-5 pt-16">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {totalGames} Main Titles
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-white transition-colors group-hover:text-zinc-100 sm:text-xl">
            {name}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {completedCount}
          </p>
        </div>

        {/* Completion Progress Bar */}
        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
          <div className="flex justify-between text-[11px] text-zinc-300">
            <span>Community Completion</span>
            <span className="font-mono font-medium">{completionRate}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}