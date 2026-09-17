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
  {
    slug: 'final-fantasy',
    name: 'Final Fantasy',
    aliases: ['final fantasy', 'ff'],
    coverImage: '/images/gameseries/finalfantasy.jpg',
    fallbackGames: [
      { title: 'Final Fantasy', releaseDate: '1987-12-18', platforms: ['Nintendo Entertainment System'], coverImage: '/images/gameseries/finalfantasy.jpg' },
      { title: 'Final Fantasy IV', releaseDate: '1991-07-19', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/finalfantasy.jpg' },
      { title: 'Final Fantasy VI', releaseDate: '1994-04-02', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/finalfantasy.jpg' },
      { title: 'Final Fantasy VII', releaseDate: '1997-01-31', platforms: ['PlayStation'], coverImage: '/images/gameseries/finalfantasy.jpg' },
      { title: 'Final Fantasy X', releaseDate: '2001-07-19', platforms: ['PlayStation 2'], coverImage: '/images/gameseries/finalfantasy.jpg' },
      { title: 'Final Fantasy XV', releaseDate: '2016-11-29', platforms: ['PlayStation 4', 'Xbox One', 'PC'], coverImage: '/images/gameseries/finalfantasy.jpg' },
    ],
  },
  {
    slug: 'the-legend-of-zelda',
    name: 'The Legend of Zelda',
    aliases: ['the legend of zelda', 'legend of zelda', 'zelda'],
    coverImage: '/images/gameseries/zelda.jpg',
    fallbackGames: [
      { title: 'The Legend of Zelda', releaseDate: '1986-02-21', platforms: ['Nintendo Entertainment System'], coverImage: '/images/gameseries/zelda.jpg' },
      { title: 'Zelda II: The Adventure of Link', releaseDate: '1987-01-14', platforms: ['Nintendo Entertainment System'], coverImage: '/images/gameseries/zelda.jpg' },
      { title: 'The Legend of Zelda: A Link to the Past', releaseDate: '1991-11-21', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/zelda.jpg' },
      { title: 'The Legend of Zelda: Ocarina of Time', releaseDate: '1998-11-21', platforms: ['Nintendo 64'], coverImage: '/images/gameseries/zelda.jpg' },
      { title: 'The Legend of Zelda: Twilight Princess', releaseDate: '2006-11-19', platforms: ['Wii', 'GameCube'], coverImage: '/images/gameseries/zelda.jpg' },
      { title: 'The Legend of Zelda: Breath of the Wild', releaseDate: '2017-03-03', platforms: ['Nintendo Switch', 'Wii U'], coverImage: '/images/gameseries/zelda.jpg' },
    ],
  },
  {
    slug: 'star-fox',
    name: 'Star Fox',
    aliases: ['star fox', 'starfox'],
    coverImage: '/images/miniaturas/starfox.jpg',
    fallbackGames: [
      { title: 'Star Fox', releaseDate: '1993-02-21', platforms: ['Super Nintendo'], coverImage: '/images/miniaturas/starfox.jpg' },
      { title: 'Star Fox 64', releaseDate: '1997-04-27', platforms: ['Nintendo 64'], coverImage: '/images/miniaturas/starfox.jpg' },
      { title: 'Star Fox Adventures', releaseDate: '2002-09-23', platforms: ['GameCube'], coverImage: '/images/miniaturas/starfox.jpg' },
      { title: 'Star Fox Assault', releaseDate: '2005-02-14', platforms: ['GameCube'], coverImage: '/images/miniaturas/starfox.jpg' },
      { title: 'Star Fox Zero', releaseDate: '2016-04-21', platforms: ['Wii U'], coverImage: '/images/miniaturas/starfox.jpg' },
    ],
  },
  {
    slug: 'kirby',
    name: 'Kirby',
    aliases: ['kirby series', 'kirby'],
    coverImage: '/images/gameseries/mario.jpg',
    fallbackGames: [
      { title: 'Kirby’s Dream Land', releaseDate: '1992-04-27', platforms: ['Game Boy'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Kirby Super Star', releaseDate: '1996-09-20', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Kirby 64: The Crystal Shards', releaseDate: '2000-03-24', platforms: ['Nintendo 64'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Kirby’s Return to Dream Land', releaseDate: '2011-10-24', platforms: ['Wii'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Kirby and the Forgotten Land', releaseDate: '2022-03-25', platforms: ['Nintendo Switch'], coverImage: '/images/gameseries/mario.jpg' },
    ],
  },
  {
    slug: 'donkey-kong',
    name: 'Donkey Kong',
    aliases: ['donkey kong', 'dk'],
    coverImage: '/images/gameseries/mario.jpg',
    fallbackGames: [
      { title: 'Donkey Kong', releaseDate: '1981-07-09', platforms: ['Arcade'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Donkey Kong Country', releaseDate: '1994-11-21', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Donkey Kong 64', releaseDate: '1999-11-22', platforms: ['Nintendo 64'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Donkey Kong Country Returns', releaseDate: '2010-11-21', platforms: ['Wii'], coverImage: '/images/gameseries/mario.jpg' },
      { title: 'Donkey Kong Country: Tropical Freeze', releaseDate: '2014-02-13', platforms: ['Wii U', 'Nintendo Switch'], coverImage: '/images/gameseries/mario.jpg' },
    ],
  },
  {
    slug: 'mega-man',
    name: 'Mega Man',
    aliases: ['mega man', 'megaman', 'rockman'],
    coverImage: '/images/gameseries/metroid.jpg',
    fallbackGames: [
      { title: 'Mega Man', releaseDate: '1987-12-17', platforms: ['Nintendo Entertainment System'], coverImage: '/images/gameseries/metroid.jpg' },
      { title: 'Mega Man 2', releaseDate: '1988-12-24', platforms: ['Nintendo Entertainment System'], coverImage: '/images/gameseries/metroid.jpg' },
      { title: 'Mega Man X', releaseDate: '1993-12-17', platforms: ['Super Nintendo'], coverImage: '/images/gameseries/metroid.jpg' },
      { title: 'Mega Man Legends', releaseDate: '1997-12-18', platforms: ['PlayStation'], coverImage: '/images/gameseries/metroid.jpg' },
      { title: 'Mega Man 11', releaseDate: '2018-10-02', platforms: ['Nintendo Switch', 'PlayStation 4', 'Xbox One', 'PC'], coverImage: '/images/gameseries/metroid.jpg' },
    ],
  },
  {
    slug: 'castlevania',
    name: 'Castlevania',
    aliases: ['castlevania', 'akumajo dracula'],
    coverImage: '/images/slider/castlevania.jpg',
    fallbackGames: [
      { title: 'Castlevania', releaseDate: '1986-09-26', platforms: ['Nintendo Entertainment System'], coverImage: '/images/slider/castlevania.jpg' },
      { title: 'Castlevania III: Dracula’s Curse', releaseDate: '1989-12-22', platforms: ['Nintendo Entertainment System'], coverImage: '/images/slider/castlevania.jpg' },
      { title: 'Castlevania: Symphony of the Night', releaseDate: '1997-03-20', platforms: ['PlayStation'], coverImage: '/images/slider/castlevania.jpg' },
      { title: 'Castlevania: Aria of Sorrow', releaseDate: '2003-05-08', platforms: ['Game Boy Advance'], coverImage: '/images/slider/castlevania.jpg' },
      { title: 'Castlevania: Lords of Shadow', releaseDate: '2010-10-05', platforms: ['PlayStation 3', 'Xbox 360'], coverImage: '/images/slider/castlevania.jpg' },
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

export async function ensureFranchiseData(franchiseConfig: {
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
}) {
  const franchise = await prisma.franchise.upsert({
    where: { slug: franchiseConfig.slug },
    update: {
      name: franchiseConfig.name,
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
  let importedGames = 0;

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
    importedGames += 1;
  }

  return { franchiseId: franchise.id, importedGames };
}

export async function seedFranchises() {
  for (const franchise of franchiseConfigs) {
    await ensureFranchiseData(franchise);
  }

  console.log('✅ Franchise data seeded from RAWG / fallback collection without deleting user progress or evidence.');
}
