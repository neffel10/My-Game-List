'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getGameBlacklistModel } from '@/lib/game-blacklist';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function deleteSelectedGames(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;

  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
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

  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
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

  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
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

  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
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

async function requireGameAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
    throw new Error('This action is restricted to administrators.');
  }
}

function parsePlatforms(value: string) {
  return value.split('|').map((platform) => platform.trim()).filter(Boolean);
}

export async function createManualGame(formData: FormData) {
  await requireGameAdmin();

  const franchiseSlug = String(formData.get('franchiseSlug') ?? '').trim();
  const subcategoryId = String(formData.get('subcategoryId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const year = Number.parseInt(String(formData.get('year') ?? ''), 10);

  if (!franchiseSlug || !subcategoryId || !title || Number.isNaN(year)) {
    throw new Error('A title, year, category and franchise are required.');
  }

  const category = await prisma.subcategory.findFirst({
    where: { id: subcategoryId, franchise: { slug: franchiseSlug } },
  });
  if (!category) throw new Error('The selected category does not belong to this franchise.');

  await prisma.game.create({
    data: {
      title,
      year,
      rawgSlug: String(formData.get('rawgSlug') ?? '').trim() || null,
      releaseDate: String(formData.get('releaseDate') ?? '').trim()
        ? new Date(String(formData.get('releaseDate')))
        : null,
      platforms: parsePlatforms(String(formData.get('platforms') ?? '')),
      description: String(formData.get('description') ?? '').trim() || null,
      subcategoryId: category.id,
    },
  });

  revalidatePath(`/franchises/${franchiseSlug}`);
  revalidatePath('/franchises');
  revalidatePath('/');
}

export async function updateManualGame(formData: FormData) {
  await requireGameAdmin();

  const gameId = String(formData.get('gameId') ?? '').trim();
  const franchiseSlug = String(formData.get('franchiseSlug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const year = Number.parseInt(String(formData.get('year') ?? ''), 10);
  if (!gameId || !franchiseSlug || !title || Number.isNaN(year)) {
    throw new Error('A title, year and game are required.');
  }

  const game = await prisma.game.findFirst({
    where: { id: gameId, subcategory: { franchise: { slug: franchiseSlug } } },
  });
  if (!game) throw new Error('Game not found in this franchise.');

  await prisma.game.update({
    where: { id: game.id },
    data: {
      title,
      year,
      rawgSlug: String(formData.get('rawgSlug') ?? '').trim() || null,
      releaseDate: String(formData.get('releaseDate') ?? '').trim()
        ? new Date(String(formData.get('releaseDate')))
        : null,
      platforms: parsePlatforms(String(formData.get('platforms') ?? '')),
      description: String(formData.get('description') ?? '').trim() || null,
    },
  });

  revalidatePath(`/franchises/${franchiseSlug}`);
  revalidatePath('/franchises');
  revalidatePath('/');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

export async function importFranchiseGamesCsv(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!ADMIN_BYPASS_ENABLED && (!session?.user || !email || !isAdminEmail(email))) {
    throw new Error('This action is restricted to administrators.');
  }

  const franchiseSlug = String(formData.get('franchiseSlug') ?? '').trim();
  const file = formData.get('file');
  if (!franchiseSlug || !(file instanceof File) || file.size === 0) {
    throw new Error('Select a CSV file and a franchise.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('The CSV file must be smaller than 2MB.');
  }

  const franchise = await prisma.franchise.findUnique({
    where: { slug: franchiseSlug },
    include: { categories: true },
  });
  if (!franchise) throw new Error('Franchise not found.');

  const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('The CSV must include a header and at least one game.');

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const requiredHeaders = ['title', 'year'];
  if (requiredHeaders.some((header) => !headers.includes(header))) {
    throw new Error('CSV headers must include title and year.');
  }

  const defaultCategory = franchise.categories[0] ?? await prisma.subcategory.create({
    data: { franchiseId: franchise.id, title: 'Mainline & Spin-offs', orderIndex: 0 },
  });
  let importedCount = 0;

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const title = row.title?.trim();
    const year = Number.parseInt(row.year, 10);
    if (!title || Number.isNaN(year)) continue;

    const categoryTitle = row.category?.trim() || defaultCategory.title;
    const category = franchise.categories.find((item) => item.title.toLowerCase() === categoryTitle.toLowerCase())
      ?? await prisma.subcategory.create({
        data: {
          franchiseId: franchise.id,
          title: categoryTitle,
          orderIndex: franchise.categories.length + importedCount,
        },
      });
    const rawgSlug = row.rawgslug?.trim() || null;
    const data = {
      title,
      year,
      rawgSlug,
      releaseDate: row.releasedate ? new Date(row.releasedate) : null,
      platforms: row.platforms ? row.platforms.split('|').map((platform) => platform.trim()).filter(Boolean) : [],
      description: row.description?.trim() || null,
      subcategoryId: category.id,
    };

    if (rawgSlug) {
      await prisma.game.upsert({ where: { rawgSlug }, update: data, create: data });
    } else {
      await prisma.game.create({ data });
    }
    importedCount += 1;
  }

  revalidatePath(`/franchises/${franchiseSlug}`);
  revalidatePath('/franchises');
  revalidatePath('/');
}
