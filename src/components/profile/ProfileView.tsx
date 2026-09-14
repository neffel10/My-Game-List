'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import { equipAvatar } from '@/app/actions/profile';
import { 
  Trophy, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Check, 
  Flame, 
  Gamepad2, 
  Calendar,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface AvatarItem {
  id: string;
  title: string;
  imageUrl: string;
  isUnlocked: boolean;
  requiredMaster: boolean;
  franchiseName: string;
  unlockedGameTitle?: string;
}

interface ProfileViewProps {
  user: {
    id: string;
    gamertag: string;
    email: string;
    image: string;
    rank: string;
    totalPoints: number;
    createdAt: string;
  };
  stats: {
    totalBeat: number;
    totalMastered: number;
    totalVerified: number;
    totalGamesTracked: number;
  };
  avatars: AvatarItem[];
}

export default function ProfileView({ user, stats, avatars }: ProfileViewProps) {
  const [currentAvatar, setCurrentAvatar] = useState(user.image);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleEquip = async (avatar: AvatarItem) => {
    if (!avatar.isUnlocked || loadingId) return;
    setLoadingId(avatar.id);

    const res = await equipAvatar(avatar.id);
    if (res.success && res.imageUrl) {
      setCurrentAvatar(res.imageUrl);
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
    setLoadingId(null);
  };

  const unlockedCount = avatars.filter((a) => a.isUnlocked).length;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 flex-1 w-full space-y-10">
        
        {/* HERO GAMER IDENTITY CARD */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-zinc-900/60 to-black p-6 sm:p-10 shadow-2xl">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Active Avatar Showcase */}
            <div className="relative h-28 w-28 sm:h-32 sm:sm:w-32 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-zinc-900 shadow-2xl shadow-black/80">
              <Image
                src={currentAvatar || '/images/avatars/default.png'}
                alt={user.gamertag}
                fill
                sizes="(max-width: 640px) 112px, 128px"
                className="object-cover"
              />
              <div className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
                Active
              </div>
            </div>

            {/* Identity Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {user.gamertag}
                </h1>
                <span className="rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-mono font-bold tracking-wider text-yellow-300">
                  {user.rank}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span>Member since {user.createdAt}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span>{user.totalPoints} Quest Score</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-center min-w-[120px]">
                <div className="text-[11px] text-zinc-400">Total Games Beat</div>
                <div className="text-xl font-black text-white mt-0.5">{stats.totalBeat}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-center min-w-[120px]">
                <div className="text-[11px] text-zinc-400">100% Mastered</div>
                <div className="text-xl font-black text-yellow-400 mt-0.5">{stats.totalMastered}</div>
              </div>
            </div>
          </div>
        </section>

        {/* OVERALL STATS BREAKDOWN */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Total Progress Tracked</div>
              <div className="text-lg font-bold text-white mt-0.5">{stats.totalGamesTracked} Titles Interacted</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Mastery Rate</div>
              <div className="text-lg font-bold text-yellow-400 mt-0.5">
                {stats.totalBeat > 0 ? Math.round((stats.totalMastered / stats.totalBeat) * 100) : 0}% of clears
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Verified Evidence</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.totalVerified} Approved Proofs</div>
            </div>
          </div>
        </section>

        {/* UNLOCKABLE AVATARS SHOWCASE & SELECTOR */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-bold tracking-tight text-white">Avatar Showcase & Cosmetics</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-zinc-300">
              {unlockedCount} / {avatars.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {avatars.map((avatar) => {
              const isCurrent = currentAvatar === avatar.imageUrl;
              const isLoading = loadingId === avatar.id;

              return (
                <div
                  key={avatar.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition-all ${
                    isCurrent
                      ? 'border-white bg-white/[0.07] shadow-xl shadow-black'
                      : avatar.isUnlocked
                      ? 'border-white/10 bg-zinc-900/40 hover:border-white/30 hover:bg-zinc-900/80'
                      : 'border-white/[0.04] bg-zinc-950/40 opacity-55'
                  }`}
                >
                  {/* Avatar Image Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/60 border border-white/5">
                    <Image
                      src={avatar.imageUrl}
                      alt={avatar.title}
                      fill
                      className={`object-cover ${!avatar.isUnlocked ? 'grayscale blur-[1px]' : ''}`}
                    />
                    {!avatar.isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Lock className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Info & Condition */}
                  <div className="mt-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        {avatar.franchiseName}
                      </div>
                      <h4 className="mt-0.5 text-xs font-bold text-white truncate" title={avatar.title}>
                        {avatar.title}
                      </h4>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {avatar.requiredMaster ? 'Require 100% Mastery' : 'Beat Story'}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2 border-t border-white/[0.06]">
                      {avatar.isUnlocked ? (
                        isCurrent ? (
                          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-white py-1">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>Equipped</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEquip(avatar)}
                            disabled={isLoading}
                            className="w-full rounded-lg border border-white/20 bg-white/10 py-1 text-[11px] font-semibold text-zinc-200 hover:border-white hover:bg-white hover:text-black transition cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            ) : (
                              'Equip'
                            )}
                          </button>
                        )
                      ) : (
                        <span className="block text-center text-[10px] text-zinc-400 py-1 italic">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}