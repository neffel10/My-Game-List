import { PrismaClient } from '@prisma/client';
import { fetchFranchiseGames, normalizePlatformNames, normalizeReleaseDate, normalizeReleaseYear } from '@/lib/rawg';
import { getBlacklistedGamesForFranchise, isBlacklistedGameMatch } from '@/lib/game-blacklist';

const prisma = new PrismaClient();

const franchiseConfigs: Array<{
  slug: string;
  name: string;
  aliases: string[];
  coverImage: string;
  fallbackGames: Array<{
    title: string;
    rawgSlug?: string;
    releaseDate?: string | null;
    platforms?: string[];
    coverImage?: string | null;
    description?: string | null;
  }>;
}> = [
  {
    slug: 'super-mario',
    name: 'Super Mario',
    aliases: ['super mario', 'mario'],
    coverImage: '/images/gameseries/mario.jpg',
    fallbackGames: [
      { title: 'Super Mario Bros.', releaseDate: '1985-09-13', platforms: ['Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Bros. 2', releaseDate: '1988-10-09', platforms: ['Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Bros. 3', releaseDate: '1988-10-23', platforms: ['Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario World', releaseDate: '1990-11-21', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario 64', releaseDate: '1996-09-29', platforms: ['Nintendo 64'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Sunshine', releaseDate: '2002-07-19', platforms: ['GameCube'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Galaxy', releaseDate: '2007-11-12', platforms: ['Wii'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Galaxy 2', releaseDate: '2010-05-23', platforms: ['Wii'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario 3D World', releaseDate: '2013-11-21', platforms: ['Wii U'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Odyssey', releaseDate: '2017-10-27', platforms: ['Nintendo Switch'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Super Mario Bros. Wonder', releaseDate: '2023-10-20', platforms: ['Nintendo Switch'], coverImage: '/images/gameseries/mario.jpg' },
    ],
  },
  {
    slug: 'pokemon',
    name: 'Pokémon',
    aliases: ['pokemon', 'pokémon', 'pokemon series'],
    coverImage: '/images/gameseries/pokemon.jpg',
    fallbackGames: [
      { title: 'Pokémon Red', releaseDate: '1996-02-27', platforms: ['Game Boy'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Gold', releaseDate: '1999-11-21', platforms: ['Game Boy Color'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Ruby', releaseDate: '2002-11-21', platforms: ['Game Boy Advance'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Diamond', releaseDate: '2006-09-28', platforms: ['Nintendo DS'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Black', releaseDate: '2010-09-18', platforms: ['Nintendo DS'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon X', releaseDate: '2013-10-12', platforms: ['Nintendo 3DS'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Sun', releaseDate: '2016-11-18', platforms: ['Nintendo 3DS'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Sword', releaseDate: '2019-11-15', platforms: ['Nintendo Switch'], coverImage: '/images/gameseries/pokemon.jpg' },
      { title: 'Pokémon Scarlet', releaseDate: '2023-11-18', platforms: ['Nintendo Switch'], coverImage: '/images/gameseries/pokemon.jpg' },
    ],
  },
  {
    slug: 'metal-gear-solid',
    name: 'Metal Gear Solid',
    aliases: ['metal gear solid', 'metal gear series'],
    coverImage: '/images/gameseries/metal-gear-solid.jpg',
    fallbackGames: [
      { title: 'Metal Gear Solid', releaseDate: '1998-10-21', platforms: ['PlayStation'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
      { title: 'Metal Gear Solid 2: Sons of Liberty', releaseDate: '2001-11-13', platforms: ['PlayStation 2'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
      { title: 'Metal Gear Solid 3: Snake Eater', releaseDate: '2004-11-17', platforms: ['PlayStation 2'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
      { title: 'Metal Gear Solid 4: Guns of the Patriots', releaseDate: '2008-06-12', platforms: ['PlayStation 3'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
      { title: 'Metal Gear Solid V: Ground Zeroes', releaseDate: '2014-03-18', platforms: ['PlayStation 4', 'Xbox One', 'PC'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
      { title: 'Metal Gear Solid V: The Phantom Pain', releaseDate: '2015-09-01', platforms: ['PlayStation 4', 'Xbox One', 'PC'], coverImage: '/images/gameseries/metal-gear-solid.jpg' },
    ],
  },
  {
    slug: 'resident-evil',
    name: 'Resident Evil',
    aliases: ['resident evil', 'biohazard'],
    coverImage: '/images/gameseries/resident-evil.jpg',
    fallbackGames: [
      { title: 'Resident Evil', releaseDate: '1996-03-22', platforms: ['PlayStation'], coverImage: '/images/gameseries/resident-evil.jpg' },
      { title: 'Resident Evil 2', releaseDate: '1998-01-21', platforms: ['PlayStation'], coverImage: '/images/gameseries/resident-evil.jpg' },
      { title: 'Resident Evil 3: Nemesis', releaseDate: '1999-09-22', platforms: ['PlayStation'], coverImage: '/images/gameseries/resident-evil.jpg' },
      { title: 'Resident Evil 4', releaseDate: '2005-01-11', platforms: ['GameCube', 'PlayStation 2'], coverImage: '/images/gameseries/resident-evil.jpg' },
      { title: 'Resident Evil 7: Biohazard', releaseDate: '2017-01-24', platforms: ['PlayStation 4', 'Xbox One', 'PC'], coverImage: '/images/gameseries/resident-evil.jpg' },
      { title: 'Resident Evil Village', releaseDate: '2021-05-07', platforms: ['PlayStation 5', 'Xbox Series S/X', 'PC'], coverImage: '/images/gameseries/resident-evil.jpg' },
    ],
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureFranchiseData(franchiseConfig: (typeof franchiseConfigs)[number]) {
  const franchise = await prisma.franchise.upsert({
    where: { slug: franchiseConfig.slug },
    update: {
      name: franchiseConfig.name,
      coverImage: franchiseConfig.coverImage,
      bannerImage: franchiseConfig.coverImage,
      apiSource: 'rawg',
    },
    create: {
      name: franchiseConfig.name,
      slug: franchiseConfig.slug,
      coverImage: franchiseConfig.coverImage,
      bannerImage: franchiseConfig.coverImage,
      apiSource: 'rawg',
    },
  });

  let defaultCategory = await prisma.subcategory.findFirst({
    where: { franchiseId: franchise.id, title: 'Mainline & Spin-offs' },
  });

  if (!defaultCategory) {
    defaultCategory = await prisma.subcategory.create({
      data: {
        title: 'Mainline & Spin-offs',
        orderIndex: 0,
        franchiseId: franchise.id,
      },
    });
  }

  const blacklistedGames = await getBlacklistedGamesForFranchise(franchiseConfig.slug);
  const games = await fetchFranchiseGames(franchiseConfig);

  for (const game of games) {
    if (isBlacklistedGameMatch(franchiseConfig.slug, game.name ?? '', game.slug ?? '', blacklistedGames)) {
      continue;
    }
    const cleanedName = game.name ?? 'Untitled Game';
    const releaseDate = normalizeReleaseDate(game.released ?? null);
    let releaseYear = normalizeReleaseYear(game.released ?? null) ?? null;
    if (!releaseYear && releaseDate instanceof Date && !Number.isNaN(releaseDate.getTime())) {
      releaseYear = releaseDate.getFullYear();
    }
    if (!releaseYear && game.released && typeof game.released === 'string') {
      const m = game.released.match(/(\d{4})/);
      if (m) releaseYear = Number(m[1]);
    }
    if (!releaseYear) releaseYear = 0;

    const platforms = normalizePlatformNames(game.platforms);
    const rawgSlug = game.slug ?? `${franchiseConfig.slug}-${slugify(cleanedName)}`;

    const existingGame = await prisma.game.findUnique({
      where: { rawgSlug },
      select: {
        id: true,
        manualCategoryOverride: true,
        subcategoryId: true,
      },
    });

    await prisma.game.upsert({
      where: { rawgSlug },
      update: {
        title: cleanedName,
        year: releaseYear,
        coverImage: game.background_image ?? franchiseConfig.coverImage,
        releaseDate,
        platforms,
        description: game.description_raw ?? null,
        ...(existingGame?.manualCategoryOverride ? {} : { subcategoryId: defaultCategory.id }),
      },
      create: {
        title: cleanedName,
        year: releaseYear,
        rawgSlug,
        coverImage: game.background_image ?? franchiseConfig.coverImage,
        releaseDate,
        platforms,
        description: game.description_raw ?? null,
        subcategoryId: defaultCategory.id,
      },
    });
  }
}

export async function seedFranchises() {
  await prisma.evidenceSubmission.deleteMany();
  await prisma.userGameProgress.deleteMany();
  await prisma.userUnlockedAvatar.deleteMany();
  await prisma.unlockableAvatar.deleteMany();

  for (const franchise of franchiseConfigs) {
    await ensureFranchiseData(franchise);
  }

  console.log('✅ Franchise data seeded from RAWG / fallback collection while preserving manual category overrides.');
}
