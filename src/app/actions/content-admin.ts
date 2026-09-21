'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToBlob, uploadImageUrlToBlob } from '@/lib/blob-upload';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { fetchFranchiseGames, normalizePlatformNames, normalizeReleaseDate, normalizeReleaseYear } from '@/lib/rawg';
import { getBlacklistedGamesForFranchise, isBlacklistedGameMatch } from '@/lib/game-blacklist';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

async function requireAdmin() {
  if (ADMIN_BYPASS_ENABLED) {
    return { user: { email: ADMIN_EMAILS[0] ?? 'admin@mygamelist.local' } };
  }

  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    throw new Error('This action is restricted to administrators.');
  }
  return session;
}

export async function createFranchise(formData: FormData) {
  try {
    await requireAdmin();

    const name = String(formData.get('name') ?? '').trim();
    const imageFile = formData.get('image');
    const imageUrl = String(formData.get('imageUrl') ?? '').trim();

    if (name.length < 2 || name.length > 80 || (!(imageFile instanceof File) && !imageUrl)) {
      console.error('[createFranchise validation failed]', {
        nameLength: name.length,
        hasImage: imageFile instanceof File || Boolean(imageUrl),
      });
      redirect('/admin/content?error=franchise-input');
    }

    if (!process.env.RAWG_API_KEY) {
      console.error('[createFranchise configuration failed] RAWG_API_KEY is missing.');
      redirect('/admin/content?error=rawg-config');
    }

    const slug = slugify(name);
    if (!slug) {
      redirect('/admin/content?error=invalid-franchise-name');
    }

    const existingFranchise = await prisma.franchise.findUnique({
      where: { slug },
      select: { id: true, coverImage: true },
    });

    if (existingFranchise) {
      const task = await prisma.importTask.create({
        data: {
          type: 'FRANCHISE_GAMES_RETRY',
          franchiseId: existingFranchise.id,
          franchiseName: name,
          status: 'PENDING',
          phase: 'Queued for retry',
        },
      });
      after(() => importFranchiseGames(task.id, existingFranchise.id, name, existingFranchise.coverImage));
      redirect(`/admin/content?task=${task.id}&retry=${encodeURIComponent(name)}`);
    }

    const storedImageUrl = imageFile instanceof File
      ? await uploadImageToBlob(imageFile, 'franchise-banners', MAX_IMAGE_SIZE)
      : await uploadImageUrlToBlob(imageUrl, 'franchise-banners', MAX_IMAGE_SIZE);
    const franchise = await prisma.franchise.create({
      data: {
        name,
        slug,
        coverImage: storedImageUrl,
        bannerImage: storedImageUrl,
        apiSource: 'rawg',
        categories: {
          create: { title: 'Mainline & Spin-offs', orderIndex: 0 },
        },
      },
    });
    const task = await prisma.importTask.create({
      data: {
        type: 'FRANCHISE_GAMES',
        franchiseId: franchise.id,
        franchiseName: name,
        status: 'PENDING',
        phase: 'Queued',
      },
    });

    after(() => importFranchiseGames(task.id, franchise.id, name, storedImageUrl));

    revalidatePath('/');
    revalidatePath('/franchises');
    revalidatePath('/admin/content');
    redirect(`/admin/content?task=${task.id}`);
  } catch (error) {
    console.error('[createFranchise failed]', error);
    const digest = error && typeof error === 'object' && 'digest' in error
      ? String(error.digest)
      : '';
    if (digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('IMAGE_URL_ERROR:')) {
      redirect(`/admin/content?error=franchise-image&message=${encodeURIComponent(error.message.replace('IMAGE_URL_ERROR: ', ''))}`);
    }
    throw error;
  }
}

export async function updateFranchiseBanner(formData: FormData) {
  await requireAdmin();

  const franchiseId = String(formData.get('franchiseId') ?? '').trim();
  const imageFile = formData.get('image');
  const imageUrl = String(formData.get('imageUrl') ?? '').trim();

  if (!franchiseId || (!(imageFile instanceof File) && !imageUrl)) {
    throw new Error('Select an image file or provide an image URL.');
  }

  const storedImageUrl = imageFile instanceof File
    ? await uploadImageToBlob(imageFile, 'franchise-banners', MAX_IMAGE_SIZE)
    : await uploadImageUrlToBlob(imageUrl, 'franchise-banners', MAX_IMAGE_SIZE);

  const franchise = await prisma.franchise.update({
    where: { id: franchiseId },
    data: { coverImage: storedImageUrl, bannerImage: storedImageUrl },
    select: { slug: true },
  });

  revalidatePath(`/franchises/${franchise.slug}`);
  revalidatePath('/franchises');
  revalidatePath('/');
  revalidatePath('/admin/content');
}

  async function importFranchiseGames(taskId: string, franchiseId: string, name: string, coverImage: string) {
    try {
      await prisma.importTask.update({
        where: { id: taskId },
        data: { status: 'RUNNING', phase: 'Querying RAWG', progress: 10 },
      });

      const config = { slug: slugify(name), name, aliases: [name], coverImage, fallbackGames: [] };
      const blacklistedGames = await getBlacklistedGamesForFranchise(config.slug);
      const rawgGames = await fetchFranchiseGames(config);
      const games = rawgGames.filter((game) => !isBlacklistedGameMatch(config.slug, game.name ?? '', game.slug ?? '', blacklistedGames));
      console.log('[importFranchiseGames results]', {
        franchise: name,
        rawgMatches: rawgGames.length,
        gamesAfterBlacklist: games.length,
      });
      const category = await prisma.subcategory.findFirstOrThrow({
        where: { franchiseId, title: 'Mainline & Spin-offs' },
        select: { id: true },
      });

      await prisma.importTask.update({
        where: { id: taskId },
        data: {         phase: games.length
          ? `Importing ${games.length} games`
          : 'RAWG returned no matching games; check the task logs for search suggestions', progress: 25, total: games.length },
      });

      let importedGames = 0;
      for (const game of games) {
        const title = game.name ?? 'Untitled Game';
        const releaseDate = normalizeReleaseDate(game.released ?? null);
        const year = normalizeReleaseYear(game.released ?? null) ?? 0;
        const rawgSlug = game.slug ?? `${config.slug}-${slugify(title)}`;
        const existing = await prisma.game.findUnique({ where: { rawgSlug }, select: { id: true, manualCategoryOverride: true } });
        await prisma.game.upsert({
          where: { rawgSlug },
          update: {
            title,
            year,
            coverImage: game.background_image ?? coverImage,
            releaseDate,
            platforms: normalizePlatformNames(game.platforms),
            description: game.description_raw ?? null,
            ...(existing?.manualCategoryOverride ? {} : { subcategoryId: category.id }),
          },
          create: {
            title,
            year,
            rawgSlug,
            coverImage: game.background_image ?? coverImage,
            releaseDate,
            platforms: normalizePlatformNames(game.platforms),
            description: game.description_raw ?? null,
            subcategoryId: category.id,
          },
        });
        importedGames += 1;
        await prisma.importTask.update({
          where: { id: taskId },
          data: { progress: 25 + Math.round((importedGames / Math.max(games.length, 1)) * 75), importedGames },
        });
      }

      await prisma.importTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          phase: importedGames ? 'Completed' : 'Completed with no matching RAWG games',
          progress: 100,
        },
      });
      revalidatePath('/');
      revalidatePath('/franchises');
      revalidatePath(`/franchises/${config.slug}`);
      revalidatePath('/admin/content');
    } catch (error) {
      console.error('[importFranchiseGames failed]', error);
      await prisma.importTask.update({
        where: { id: taskId },
        data: { status: 'FAILED', phase: 'Import failed', error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

export async function saveFeaturedFanArt(formData: FormData) {
  try {
    await requireAdmin();

    const franchiseId = String(formData.get('franchiseId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const artistName = String(formData.get('artistName') ?? '').trim();
    const month = String(formData.get('month') ?? '').trim();
    const imageFile = formData.get('image');

    console.log('[saveFeaturedFanArt]', {
      franchiseId,
      title,
      artistName,
      month,
      hasImage: imageFile instanceof File,
      imageName: imageFile instanceof File ? imageFile.name : null,
      imageSize: imageFile instanceof File ? imageFile.size : null,
      adminBypass: ADMIN_BYPASS_ENABLED,
    });

    if (!franchiseId || !title || !artistName || !month || !(imageFile instanceof File)) {
      throw new Error('Franchise, title, artist, month, and image are required.');
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'fan-art-featured', MAX_IMAGE_SIZE);
    const year = Number(formData.get('year') ?? new Date().getFullYear());

    await prisma.fanArtSubmission.updateMany({
      where: { isFeatured: true },
      data: { isFeatured: false },
    });

    await prisma.fanArtSubmission.create({
      data: {
        franchiseId,
        title,
        artistName,
        imageUrl,
        month,
        year,
        isFeatured: true,
        isActive: true,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('[saveFeaturedFanArt failed]', error);
    throw error;
  }
}

export async function saveFranchiseFanArt(formData: FormData) {
  try {
    await requireAdmin();

    const franchiseId = String(formData.get('franchiseId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const artistName = String(formData.get('artistName') ?? '').trim();
    const month = String(formData.get('month') ?? '').trim();
    const imageFile = formData.get('image');

    console.log('[saveFranchiseFanArt]', {
      franchiseId,
      title,
      artistName,
      month,
      hasImage: imageFile instanceof File,
      imageName: imageFile instanceof File ? imageFile.name : null,
      imageSize: imageFile instanceof File ? imageFile.size : null,
    });

    if (!franchiseId || !title || !artistName || !month || !(imageFile instanceof File)) {
      console.error('[saveFranchiseFanArt validation failed]', {
        franchiseId,
        title,
        artistName,
        month,
        hasImage: imageFile instanceof File,
      });
      throw new Error('Franchise fan art validation failed.');
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'fan-art-franchise', MAX_IMAGE_SIZE);
    const year = Number(formData.get('year') ?? new Date().getFullYear());

    await prisma.fanArtSubmission.create({
      data: {
        franchiseId,
        title,
        artistName,
        imageUrl,
        month,
        year,
        isFeatured: false,
        isActive: true,
      },
    });

    await prisma.franchise.update({
      where: { id: franchiseId },
      data: {
        coverImage: imageUrl,
        bannerImage: imageUrl,
      },
    });

    revalidatePath('/');
    revalidatePath('/franchises');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('[saveFranchiseFanArt failed]', error);
    throw error;
  }
}

export async function saveReward(formData: FormData) {
  try {
    await requireAdmin();

    const title = String(formData.get('title') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const category = String(formData.get('category') ?? 'PHYSICAL').trim();
    const pointsRequired = Number(formData.get('pointsRequired') ?? 0);
    const stock = Number(formData.get('stock') ?? 1);
    const externalLink = String(formData.get('externalLink') ?? '').trim();
    const imageFile = formData.get('image');

    console.log('[saveReward]', {
      title,
      company,
      pointsRequired,
      category,
      hasImage: imageFile instanceof File,
      imageName: imageFile instanceof File ? imageFile.name : null,
      imageSize: imageFile instanceof File ? imageFile.size : null,
    });

    if (!title || !company || !(imageFile instanceof File) || !Number.isFinite(pointsRequired) || pointsRequired <= 0) {
      console.error('[saveReward validation failed]', {
        title,
        company,
        pointsRequired,
        hasImage: imageFile instanceof File,
      });
      throw new Error('Reward validation failed.');
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'rewards', MAX_IMAGE_SIZE);

    await prisma.reward.create({
      data: {
        title,
        company,
        description: description || null,
        imageUrl,
        pointsRequired,
        stock: Number.isFinite(stock) && stock > 0 ? stock : 1,
        category: category || 'PHYSICAL',
        isActive: true,
        externalLink: externalLink || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/rewards');
    revalidatePath('/admin/content');
  } catch (error) {
    console.error('[saveReward failed]', error);
    throw error;
  }
}

export async function toggleFanArtStatus(id: string, isActive: boolean) {
  try {
    await requireAdmin();
    await prisma.fanArtSubmission.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('toggleFanArtStatus failed:', error);
    return;
  }
}

export async function toggleRewardStatus(id: string, isActive: boolean) {
  try {
    await requireAdmin();
    await prisma.reward.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/rewards');
  } catch (error) {
    console.error('toggleRewardStatus failed:', error);
    return;
  }
}
