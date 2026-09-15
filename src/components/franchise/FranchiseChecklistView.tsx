'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import CelebrationOverlay, { CelebrationType } from '@/components/franchise/CelebrationOverlay';
import { toggleUserGameProgress } from '@/app/actions/progress';
import { uploadEvidence } from '@/app/actions/evidence';
import { createFranchiseSubcategory, deleteSelectedGames, updateGameCategory } from '@/app/actions/game-admin';
import {
  UploadCloud,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Gamepad2,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { BeatGameToggle, MasteredToggle } from '@/components/franchise/CheckToggles';

export interface ClientGame {
  id: string;
  title: string;
  year: number;
  platforms?: string[];
  completed: boolean;
  mastered: boolean;
  progressId: string | null;
  evidenceStatus: 'none' | 'pending' | 'verified' | 'rejected';
}

export interface ClientCategory {
  id: string;
  title: string;
  games: ClientGame[];
}

interface FranchiseChecklistViewProps {
  franchiseName: string;
  coverImage: string;
  coverArtistName?: string | null;
  franchiseSlug: string;
  isAdmin: boolean;
  initialCategories: ClientCategory[];
}

export default function FranchiseChecklistView({
  franchiseName,
  coverImage,
  coverArtistName,
  franchiseSlug,
  isAdmin,
  initialCategories,
}: FranchiseChecklistViewProps) {
  const [categories, setCategories] = useState<ClientCategory[]>(initialCategories);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null);
  const [deletingGames, setDeletingGames] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [celebration, setCelebration] = useState<{
    type: CelebrationType;
    gameTitle: string;
  }>({
    type: null,
    gameTitle: '',
  });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedGames = categories.flatMap((cat) => cat.games.filter((game) => selectedGameIds.includes(game.id)));

  const toggleGameSelection = (gameId: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  const handleDeleteSelectedGames = async () => {
    if (selectedGameIds.length === 0) return;

    setDeletingGames(true);
    setDeleteError(null);

    const formData = new FormData();
    selectedGameIds.forEach((gameId) => formData.append('gameIds', gameId));
    formData.append('franchiseSlug', franchiseSlug);

    const result = await deleteSelectedGames(formData);

    if (result?.error) {
      setDeleteError(result.error);
      setDeletingGames(false);
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        games: cat.games.filter((game) => !selectedGameIds.includes(game.id)),
      }))
    );
    setSelectedGameIds([]);
    setShowDeleteModal(false);
    setDeletingGames(false);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCategories(updated);
  };

  const handleCreateCategory = async () => {
    const sanitizedTitle = newCategoryTitle.trim();
    if (!sanitizedTitle) return;

    setCreatingCategory(true);
    const formData = new FormData();
    formData.append('franchiseSlug', franchiseSlug);
    formData.append('title', sanitizedTitle);

    const result = await createFranchiseSubcategory(formData);
    if (result?.error) {
      alert(result.error);
      setCreatingCategory(false);
      return;
    }

    if (!result?.subcategoryId || !result?.title) {
      alert('The new section could not be created.');
      setCreatingCategory(false);
      return;
    }

    setCategories((prev) => [
      ...prev,
      {
        id: result.subcategoryId,
        title: result.title,
        games: [],
      },
    ]);
    setNewCategoryTitle('');
    setCreatingCategory(false);
  };

  const handleMoveGameToCategory = async (gameId: string, nextCategoryId: string) => {
    if (!nextCategoryId) return;

    const currentCategory = categories.find((category) => category.games.some((game) => game.id === gameId));
    const targetCategory = categories.find((category) => category.id === nextCategoryId);
    const game = currentCategory?.games.find((item) => item.id === gameId);

    if (!currentCategory || !targetCategory || !game) {
      return;
    }

    if (currentCategory.id === targetCategory.id) {
      return;
    }

    const formData = new FormData();
    formData.append('gameId', gameId);
    formData.append('subcategoryId', nextCategoryId);

    const result = await updateGameCategory(formData);
    if (result?.error) {
      alert(result.error);
      return;
    }

    setCategories((prev) =>
      prev.map((category) => {
        if (category.id === currentCategory.id) {
          return {
            ...category,
            games: category.games.filter((item) => item.id !== gameId),
          };
        }

        if (category.id === targetCategory.id) {
          return {
            ...category,
            games: [...category.games, game],
          };
        }

        return category;
      })
    );
  };

  const handleEvidenceUpload = async (gameId: string, progressId: string | null, file: File | null) => {
    if (!file || !progressId) {
      setUploadError('Please complete the game first so the evidence can be attached to it.');
      return;
    }

    const nextFile = file;
    const isValidImage = nextFile.type.startsWith('image/');
    const maxBytes = 4 * 1024 * 1024;

    if (!isValidImage) {
      setUploadError('Only image files are supported as proof.');
      return;
    }

    if (nextFile.size > maxBytes) {
      setUploadError('Please upload an image smaller than 4MB.');
      return;
    }

    setUploadingGameId(gameId);
    setUploadError(null);

    const formData = new FormData();
    formData.append('progressId', progressId);
    formData.append('file', nextFile);

    const result = await uploadEvidence(formData);

    if (result?.error) {
      setUploadError(result.error);
    } else {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          games: cat.games.map((game) => {
            if (game.id !== gameId) return game;
            return {
              ...game,
              evidenceStatus: 'pending',
            };
          }),
        }))
      );
    }

    setUploadingGameId(null);
    if (fileInputRefs.current[gameId]) {
      fileInputRefs.current[gameId]!.value = '';
    }
  };

  const toggleGameStatus = async (
    catId: string,
    gameId: string,
    field: 'completed' | 'mastered'
  ) => {
    const category = categories.find((c) => c.id === catId);
    const game = category?.games.find((g) => g.id === gameId);
    if (!game) return;

    const currentCompleted = game.completed;
    const currentMastered = game.mastered;

    // 1. Cálculo del nuevo estado local inmediato (UI optimista)
    let nextCompleted = currentCompleted;
    let nextMastered = currentMastered;

    if (field === 'completed') {
      nextCompleted = !currentCompleted;
      if (nextCompleted) {
        setCelebration({ type: 'beat', gameTitle: game.title });
      } else {
        nextMastered = false;
      }
    } else if (field === 'mastered') {
      nextMastered = !currentMastered;
      if (nextMastered) {
        setCelebration({ type: 'mastered', gameTitle: game.title });
        nextCompleted = true;
      }
    }

    // Actualizar inmediatamente la UI
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          games: cat.games.map((g) => {
            if (g.id !== gameId) return g;
            return {
              ...g,
              completed: nextCompleted,
              mastered: nextMastered,
            };
          }),
        };
      })
    );

    // 2. Persistir en Neon en segundo plano con Server Action
    const res = await toggleUserGameProgress(
      gameId,
      field,
      currentCompleted,
      currentMastered
    );

    // Si falló (por ejemplo, sesión expirada), revertir al estado previo
    if (res?.error) {
      alert(res.error);
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id !== catId) return cat;
          return {
            ...cat,
            games: cat.games.map((g) => {
              if (g.id !== gameId) return g;
              return {
                ...g,
                completed: currentCompleted,
                mastered: currentMastered,
              };
            }),
          };
        })
      );
    }
  };

  const allGames = categories.flatMap((c) => c.games);
  const totalGames = allGames.length;
  const masteredCount = allGames.filter((g) => g.mastered).length;
  const completedOnlyCount = allGames.filter((g) => g.completed && !g.mastered).length;
  const verifiedCount = allGames.filter((g) => g.evidenceStatus === 'verified').length;
  const unfinishedCount = totalGames - (masteredCount + completedOnlyCount);

  const totalPoints = (completedOnlyCount * 50) + (masteredCount * 120) + (verifiedCount * 25);

  const pMastered = totalGames > 0 ? (masteredCount / totalGames) * 100 : 0;
  const pCompleted = totalGames > 0 ? (completedOnlyCount / totalGames) * 100 : 0;
  const pUnfinished = totalGames > 0 ? (unfinishedCount / totalGames) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
      <Navbar />

      {/* HEADER BANNER */}
      <section className="relative h-64 sm:h-72 w-full overflow-hidden border-b border-white/10 bg-zinc-950">
        <Image
          src={coverImage}
          alt={`${franchiseName} Franchise Banner`}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center opacity-40 select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <span>Franchise Checklist</span>
                <span>•</span>
                <span className="text-zinc-300">Live Database</span>
              </div>
              <h1 className="mt-1 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                {franchiseName} Series
              </h1>
              {coverArtistName && (
                <p className="mt-2 text-sm text-zinc-200">
                  Fan art by <span className="font-semibold text-white">{coverArtistName}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
              <div className="text-right">
                <div className="text-xs text-zinc-400">Total Completion</div>
                <div className="text-lg font-bold text-white">
                  {totalGames > 0 ? Math.round(((masteredCount + completedOnlyCount) / totalGames) * 100) : 0}%
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-right">
                <div className="text-xs text-zinc-400">Total Games</div>
                <div className="text-lg font-bold text-white">{totalGames}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* TABLAS CHECKLIST */}
          <main className="lg:col-span-8 space-y-8">
            {uploadError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-white" />
                <h2 className="text-base font-semibold text-white">Subseries & Games</h2>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs">
                {(['all', 'completed', 'pending'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`rounded-md px-3 py-1 font-medium capitalize transition cursor-pointer ${
                      filter === mode
                        ? 'bg-white text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                    <input
                      value={newCategoryTitle}
                      onChange={(event) => setNewCategoryTitle(event.target.value)}
                      placeholder="New section tag"
                      className="w-36 bg-transparent px-2 py-1 text-xs text-white placeholder:text-zinc-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory || !newCategoryTitle.trim()}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {creatingCategory ? 'Saving...' : 'Add tag'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={selectedGameIds.length === 0 || deletingGames}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete games{selectedGameIds.length > 0 ? ` (${selectedGameIds.length})` : ''}
                  </button>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {deleteError}
              </div>
            )}

            {categories.map((category, catIdx) => {
              const filteredGames = category.games.filter((g) => {
                if (filter === 'completed') return g.completed;
                if (filter === 'pending') return !g.completed;
                return true;
              });

              if (filteredGames.length === 0 && filter !== 'all') return null;

              return (
                <div 
                  key={category.id}
                  className="rounded-xl border border-white/[0.08] bg-zinc-900/30 overflow-hidden shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs font-mono text-zinc-400 border border-white/10">
                        {catIdx + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        {category.title}
                      </h3>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-400">
                        {category.games.filter((g) => g.completed).length} / {category.games.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveCategory(catIdx, 'up')}
                        disabled={catIdx === 0}
                        title="Move category up"
                        className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveCategory(catIdx, 'down')}
                        disabled={catIdx === categories.length - 1}
                        title="Move category down"
                        className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="border-b border-white/[0.05] bg-black/40 text-[11px] uppercase tracking-wider text-zinc-400">
                        <tr>
                          {isAdmin && <th className="py-3 pl-4 sm:pl-6 w-10 text-center">Select</th>}
                          <th className="py-3 pl-4 sm:pl-6">Title</th>
                          <th className="py-3 px-3 text-center w-28">Beat Game</th>
                          <th className="py-3 px-3 text-center w-28">100% Mastered</th>
                          <th className="py-3 pr-4 sm:pr-6 text-right w-36">Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredGames.map((game) => (
                          <tr key={game.id} className="transition-colors hover:bg-white/[0.02]">
                            {isAdmin && (
                              <td className="py-3 pl-4 sm:pl-6 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedGameIds.includes(game.id)}
                                  onChange={() => toggleGameSelection(game.id)}
                                  className="h-4 w-4 accent-red-500"
                                  aria-label={`Select ${game.title}`}
                                />
                              </td>
                            )}
                            <td className="py-3 pl-4 sm:pl-6 font-medium text-white">
                              <div className="flex flex-col">
                                <span>{game.title}</span>
                                <span className="text-[11px] text-zinc-400">{game.year && game.year !== 0 ? game.year : ''}{(game.platforms && game.platforms.length > 0) ? ` • ${game.platforms.join(', ')}` : ''}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <BeatGameToggle
                                active={game.completed}
                                onToggle={() => toggleGameStatus(category.id, game.id, 'completed')}
                              />
                            </td>

                            <td className="py-3 px-3 text-center">
                              <MasteredToggle
                                active={game.mastered}
                                onToggle={() => toggleGameStatus(category.id, game.id, 'mastered')}
                              />
                            </td>

                            <td className="py-3 pr-4 sm:pr-6 text-right">
                             {isAdmin ? (
                               <div className="flex items-center justify-end gap-2">
                                 <select
                                   value={category.id}
                                   onChange={(event) => handleMoveGameToCategory(game.id, event.target.value)}
                                   className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-200 outline-none"
                                   aria-label={`Assign ${game.title} to a tag`}
                                 >
                                   {categories.map((option) => (
                                     <option key={option.id} value={option.id}>
                                       {option.title}
                                     </option>
                                   ))}
                                 </select>

                                 {game.evidenceStatus === 'verified' && (
                                   <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                     <ShieldCheck className="h-3.5 w-3.5" />
                                     Verified
                                   </span>
                                 )}
                                 {game.evidenceStatus === 'pending' && (
                                   <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                                     <FileCheck className="h-3.5 w-3.5" />
                                     Pending
                                   </span>
                                 )}
                                 {game.evidenceStatus === 'rejected' && (
                                   <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-300">
                                     <AlertTriangle className="h-3.5 w-3.5" />
                                     Rejected
                                   </span>
                                 )}
                                 {game.evidenceStatus === 'none' && (
                                   <button
                                     type="button"
                                     onClick={() => fileInputRefs.current[game.id]?.click()}
                                     disabled={uploadingGameId === game.id}
                                     className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-white hover:text-black hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
                                   >
                                     <UploadCloud className="h-3 w-3" />
                                     {uploadingGameId === game.id ? 'Uploading...' : 'Upload'}
                                   </button>
                                 )}
                                 <input
                                   ref={(node) => {
                                     fileInputRefs.current[game.id] = node;
                                   }}
                                   type="file"
                                   accept="image/png,image/jpeg,image/webp"
                                   className="hidden"
                                   onChange={(event) =>
                                     handleEvidenceUpload(game.id, game.progressId, event.target.files?.[0] ?? null)
                                   }
                                 />
                               </div>
                             ) : (
                               <>
                                 {game.evidenceStatus === 'verified' && (
                                   <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                     <ShieldCheck className="h-3.5 w-3.5" />
                                     Verified
                                   </span>
                                 )}
                                 {game.evidenceStatus === 'pending' && (
                                   <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                                     <FileCheck className="h-3.5 w-3.5" />
                                     Pending
                                   </span>
                                 )}
                                 {game.evidenceStatus === 'rejected' && (
                                   <div className="flex items-center justify-end gap-2">
                                     <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-300">
                                       <AlertTriangle className="h-3.5 w-3.5" />
                                       Rejected
                                     </span>
                                     <button
                                       type="button"
                                       onClick={() => fileInputRefs.current[game.id]?.click()}
                                       disabled={uploadingGameId === game.id}
                                       className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                     >
                                       <UploadCloud className="h-3 w-3" />
                                       Re-upload
                                     </button>
                                     <input
                                       ref={(node) => {
                                         fileInputRefs.current[game.id] = node;
                                       }}
                                       type="file"
                                       accept="image/png,image/jpeg,image/webp"
                                       className="hidden"
                                       onChange={(event) =>
                                         handleEvidenceUpload(game.id, game.progressId, event.target.files?.[0] ?? null)
                                       }
                                     />
                                   </div>
                                 )}
                                 {game.evidenceStatus === 'none' && (
                                   <div className="flex items-center justify-end gap-2">
                                     <button
                                       type="button"
                                       onClick={() => fileInputRefs.current[game.id]?.click()}
                                       disabled={uploadingGameId === game.id}
                                       className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-white hover:text-black hover:border-white disabled:cursor-not-allowed disabled:opacity-50"
                                     >
                                       <UploadCloud className="h-3 w-3" />
                                       {uploadingGameId === game.id ? 'Uploading...' : 'Upload'}
                                     </button>
                                     <input
                                       ref={(node) => {
                                         fileInputRefs.current[game.id] = node;
                                       }}
                                       type="file"
                                       accept="image/png,image/jpeg,image/webp"
                                       className="hidden"
                                       onChange={(event) =>
                                         handleEvidenceUpload(game.id, game.progressId, event.target.files?.[0] ?? null)
                                       }
                                     />
                                   </div>
                                 )}
                               </>
                             )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {isAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={selectedGameIds.length === 0 || deletingGames}
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete selected games{selectedGameIds.length > 0 ? ` (${selectedGameIds.length})` : ''}
                </button>
              </div>
            )}
          </main>

          {/* GAMER CARD & STATS */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="sticky top-20 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] via-zinc-900/60 to-zinc-950 p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-zinc-800">
                      <Image
                        src={coverImage}
                        alt="Avatar"
                        fill
                        sizes="(max-width: 1024px) 100vw, 96px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Gamer Card</div>
                      <h4 className="text-base font-bold text-white">NEFFEL10</h4>
                    </div>
                  </div>
                  <span className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-white">
                    Master
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                    <div className="text-[11px] text-zinc-400">Total Score</div>
                    <div className="text-base font-bold text-white mt-0.5">{totalPoints} pts</div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                    <div className="text-[11px] text-zinc-400">Proofs Verified</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{verifiedCount}</div>
                  </div>
                </div>

                {/* SVG DONUT CHART */}
                <div className="mt-6 border-t border-white/10 pt-5">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
                    Completion Breakdown
                  </h5>

                  <div className="flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke="#27272a"
                          strokeWidth="3.2"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke="#ffffff"
                          strokeWidth="3.2"
                          strokeDasharray={`${pCompleted} ${100 - pCompleted}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke="#facc15"
                          strokeWidth="3.2"
                          strokeDasharray={`${pMastered} ${100 - pMastered}`}
                          strokeDashoffset={`-${pCompleted}`}
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="absolute text-center">
                        <span className="text-2xl font-extrabold text-white">
                          {totalGames > 0 ? Math.round(((masteredCount + completedOnlyCount) / totalGames) * 100) : 0}%
                        </span>
                        <div className="text-[10px] text-zinc-400">Total Beat</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <span className="text-zinc-300">100% Mastered</span>
                      </div>
                      <span className="font-mono text-zinc-400">{masteredCount} games ({Math.round(pMastered)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                        <span className="text-zinc-300">Completed (Story)</span>
                      </div>
                      <span className="font-mono text-zinc-400">{completedOnlyCount} games ({Math.round(pCompleted)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                        <span className="text-zinc-300">Unfinished</span>
                      </div>
                      <span className="font-mono text-zinc-400">{unfinishedCount} games ({Math.round(pUnfinished)}%)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </aside>

        </div>
      </div>

      {showDeleteModal && isAdmin && selectedGames.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
              Confirm deletion
            </div>
            <h3 className="text-2xl font-bold text-white">Delete selected games?</h3>
            <p className="mt-2 text-sm text-zinc-300">
              This action will remove the selected games from the franchise and add them to the blacklist, so they will not be imported again by the seeding process.
            </p>
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3">
              <ul className="space-y-2 text-sm text-zinc-200">
                {selectedGames.map((game) => (
                  <li key={game.id}>• {game.title}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedGames}
                disabled={deletingGames}
                className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingGames ? 'Deleting...' : 'Delete games'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CelebrationOverlay
        type={celebration.type}
        gameTitle={celebration.gameTitle}
        onClose={() => setCelebration({ type: null, gameTitle: '' })}
      />
    </div>
  );
}