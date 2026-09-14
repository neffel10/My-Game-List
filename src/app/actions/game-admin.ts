'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getGameBlacklistModel } from '@/lib/game-blacklist';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function deleteSelectedGames(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;

  if (!session?.user || !email || !isAdminEmail(email)) {
    return { error: 'This action is restricted to administrators.' };
  }

  const blacklistModel = getGameBlacklistModel();
  if (!blacklistModel) {
    return {
      error: 'The blacklist model is not available. Regenerate the Prisma client and restart the dev server.',
    };
  }

  const rawGameIds = formData.getAll('gameIds');
  const gameIds = rawGameIds
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);

  const franchiseSlug = String(formData.get('franchiseSlug') ?? '').trim();

  if (gameIds.length === 0) {
    return { error: 'Select at least one game to delete.' };
  }

  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    include: {
      subcategory: {
        include: {
          franchise: true,
        },
      },
    },
  });

  if (games.length === 0) {
    return { error: 'No valid games were found to delete.' };
  }

  const targetFranchiseSlug = franchiseSlug || games[0].subcategory.franchise.slug;

  for (const game of games) {
    const existing = await blacklistModel.findFirst({
      where: {
        franchiseSlug: targetFranchiseSlug,
        OR: [
          { rawgSlug: game.rawgSlug ?? null },
          { title: game.title },
        ],
      },
    });

    if (!existing) {
      await blacklistModel.create({
        data: {
          franchiseSlug: targetFranchiseSlug,
          rawgSlug: game.rawgSlug ?? null,
          title: game.title,
          reason: 'Manual admin cleanup',
        },
      });
    }
  }

  await prisma.game.deleteMany({
    where: { id: { in: gameIds } },
  });

  revalidatePath(`/franchises/${targetFranchiseSlug}`);
  revalidatePath('/franchises');
  revalidatePath('/');

  return { success: true, deletedCount: games.length };
}

export async function removeBlacklistedGame(id: string): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;

  if (!session?.user || !email || !isAdminEmail(email)) {
    throw new Error('This action is restricted to administrators.');
  }

  const blacklistModel = getGameBlacklistModel();
  if (!blacklistModel) {
    throw new Error('The blacklist model is not available. Regenerate the Prisma client and restart the dev server.');
  }

  await blacklistModel.delete({
    where: { id },
  });

  revalidatePath('/admin/blacklist');
  revalidatePath('/franchises');
  revalidatePath('/');
}

export async function createFranchiseSubcategory(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;

  if (!session?.user || !email || !isAdminEmail(email)) {
    return { error: 'This action is restricted to administrators.' };
  }

  const franchiseSlug = String(formData.get('franchiseSlug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  if (!franchiseSlug || !title) {
    return { error: 'A franchise and a title are required.' };
  }

  const franchise = await prisma.franchise.findUnique({
    where: { slug: franchiseSlug },
    include: { categories: true },
  });

  if (!franchise) {
    return { error: 'Franchise not found.' };
  }

  const existingSameTitle = franchise.categories.some(
    (category) => category.title.toLowerCase() === title.toLowerCase()
  );

  if (existingSameTitle) {
    return { error: 'That section already exists for this franchise.' };
  }

  const newCategory = await prisma.subcategory.create({
    data: {
      franchiseId: franchise.id,
      title,
      orderIndex: franchise.categories.length,
    },
  });

  revalidatePath(`/franchises/${franchiseSlug}`);
  revalidatePath('/franchises');
  revalidatePath('/');

  return { success: true, title: newCategory.title, subcategoryId: newCategory.id };
}

export async function updateGameCategory(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;

  if (!session?.user || !email || !isAdminEmail(email)) {
    return { error: 'This action is restricted to administrators.' };
  }

  const gameId = String(formData.get('gameId') ?? '').trim();
  const subcategoryId = String(formData.get('subcategoryId') ?? '').trim();

  if (!gameId || !subcategoryId) {
    return { error: 'A game and a section are required.' };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      subcategory: {
        include: { franchise: true },
      },
    },
  });

  if (!game) {
    return { error: 'Game not found.' };
  }

  const targetCategory = await prisma.subcategory.findFirst({
    where: {
      id: subcategoryId,
      franchiseId: game.subcategory.franchiseId,
    },
  });

  if (!targetCategory) {
    return { error: 'The selected section does not belong to this franchise.' };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      subcategoryId: targetCategory.id,
      manualCategoryOverride: true,
    },
  });

  revalidatePath(`/franchises/${game.subcategory.franchise.slug}`);
  revalidatePath('/franchises');
  revalidatePath('/');

  return { success: true, title: targetCategory.title };
}
