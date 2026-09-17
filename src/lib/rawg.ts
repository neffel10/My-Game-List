import { getBlacklistedGamesForFranchise, isBlacklistedGameMatch } from '@/lib/game-blacklist';

export type RawgPlatform = {
  platform?: {
    name?: string;
    slug?: string;
  };
};

export type RawgGenre = {
  name?: string;
  slug?: string;
};

export type RawgTag = {
  id?: number;
  name?: string;
  slug?: string;
};

export type RawgGameResult = {
  id?: number;
  name?: string;
  slug?: string;
  released?: string | null;
  background_image?: string | null;
  platforms?: RawgPlatform[];
  genres?: RawgGenre[];
  tags?: RawgTag[];
  description_raw?: string | null;
  developers?: { name?: string }[];
  publishers?: { name?: string }[];
};

export type FranchiseSeedConfig = {
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
};

const RAWG_BASE_URL = process.env.RAWG_BASE_URL ?? 'https://api.rawg.io/api';

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeForMatch(s?: string) {
  if (!s) return '';
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getSearchTerms(value: string) {
  const normalized = normalizeForMatch(value);
  const words = stripDiacritics(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !['the', 'game', 'games', 'series'].includes(word));

  return [...new Set([normalized, words.join(''), ...words].filter(Boolean))];
}

export function normalizePlatformNames(platforms?: RawgPlatform[]) {
  const platformNames = (platforms ?? [])
    .map((platform) => platform.platform?.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => name.trim());

  return [...new Set(platformNames)];
}

export function normalizeReleaseYear(released?: string | null) {
  if (!released) return null;

  const parsedDate = new Date(released);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.getFullYear();
}

export function normalizeReleaseDate(released?: string | null) {
  if (!released) return null;

  const parsedDate = new Date(released);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate;
}

export async function fetchRawgGames(searchQuery: string, options?: { pageSize?: number; exact?: boolean }) {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    return [] as RawgGameResult[];
  }

  const params = new URLSearchParams({
    key: apiKey,
    search: searchQuery,
    page_size: String(options?.pageSize ?? 100),
    ordering: 'released',
  });

  if (options?.exact) params.set('search_exact', 'true');

  const response = await fetch(`${RAWG_BASE_URL}/games?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`RAWG request failed for "${searchQuery}": ${response.status}`);
  }

  const payload = (await response.json()) as { results?: RawgGameResult[] };
  return payload.results ?? [];
}

export async function fetchRawgGameDetails(idOrSlug: string | number) {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`${RAWG_BASE_URL}/games/${idOrSlug}?key=${apiKey}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return (await response.json()) as RawgGameResult | null;
}

export async function fetchFranchiseGames(config: FranchiseSeedConfig) {
  if (!process.env.RAWG_API_KEY) {
    return config.fallbackGames.map((game) => ({
      name: game.title,
      slug: game.rawgSlug ?? game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      released: game.releaseDate ?? null,
      background_image: game.coverImage ?? null,
      platforms: (game.platforms ?? []).map((platform) => ({ platform: { name: platform } })),
      description_raw: game.description ?? null,
    }));
  }

  // Build a set of search queries: franchise name, aliases and the known fallback titles
  const blacklistedGames = await getBlacklistedGamesForFranchise(config.slug);
  const queries = [
    ...[config.name, ...config.aliases].flatMap((value) => getSearchTerms(value)),
    ...config.fallbackGames.map((g) => g.title),
  ].filter(Boolean);
  const seen = new Map<string, RawgGameResult>();

  for (const query of queries) {
    // Use exact search for specific game titles (the fallback list), and broader search for franchise name/aliases
    const isExact = config.fallbackGames.some((g) => g.title && g.title.toLowerCase() === query.toLowerCase());
    const results = await fetchRawgGames(query, { pageSize: 100, exact: isExact });
    console.log('[RAWG franchise search]', {
      franchise: config.name,
      query,
      resultCount: results.length,
    });

    for (const result of results) {
      const slug = result.slug ?? result.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!slug || !result.name) continue;
      if (!seen.has(slug)) {
        seen.set(slug, result);
      }
    }
  }

  // Filter results to reduce false positives: require the game name or slug to include the franchise or an alias.
  const franchiseNorm = normalizeForMatch(config.slug);
  const aliasesNorm = [config.name, ...config.aliases]
    .flatMap((value) => getSearchTerms(value))
    .filter(Boolean);
  const franchiseTerms = [...new Set(
    [config.name, ...config.aliases]
      .flatMap((value) => stripDiacritics(value).toLowerCase().split(/[^a-z0-9]+/))
      .filter((term) => term.length > 2 && !['the', 'game', 'games', 'series'].includes(term)),
  )];

  const filtered: RawgGameResult[] = [];

  for (const result of seen.values()) {
    const title = result.name ?? '';
    const slug = result.slug ?? '';

    if (isBlacklistedGameMatch(config.slug, title, slug, blacklistedGames)) {
      continue;
    }

    const nameNorm = normalizeForMatch(result.name);
    const slugNorm = normalizeForMatch(result.slug);

    const matchesAlias = aliasesNorm.some((a) => a && (nameNorm.includes(a) || slugNorm.includes(a)));
    const matchesFranchiseSlug = franchiseNorm && slugNorm.includes(franchiseNorm);
    const matchingTerms = franchiseTerms.filter((term) => nameNorm.includes(term) || slugNorm.includes(term));
    const matchesRelevantTerm =
      matchingTerms.length >= 2 ||
      (matchingTerms.length === 1 && matchingTerms[0].length >= 6);

    if (matchesAlias || matchesFranchiseSlug || matchesRelevantTerm) {
      filtered.push(result);
      continue;
    }

    // If it didn't match by text, try a more expensive check: fetch details and inspect description/slug again.
    try {
          const details = result.id ? await fetchRawgGameDetails(result.id) : result;
          const dName = details?.name ?? '';
          const dSlug = details?.slug ?? '';
          const dDesc = (details as any)?.description_raw ?? '';

          const dNameNorm = normalizeForMatch(dName);
          const dSlugNorm = normalizeForMatch(dSlug);
          const dDescNorm = normalizeForMatch(dDesc);

          // Exclude clearly unofficial / fan-made / prototype / demo / hack / translation entries
          const disallowedNameTokens = [
            'fanmade',
            'fangame',
            'prototype',
            'demo',
            'unofficial',
            'bootleg',
            'romhack',
            'hack',
            'translation',
            'leak',
            'notpokemon',
            'definitelynot',
            'unreleased',
          ];

          const disallowedTagTokens = [
            'mod',
            'fan',
            'fan-made',
            'translation',
            'hack',
            'prototype',
            'demo',
            'beta',
            'alpha',
            'bootleg',
            'unofficial',
          ];

          const disallowedRemakeTokens = [
            'remake',
            'remaster',
            'remastered',
            'anniversary',
            'collection',
            'compilation',
            'hd',
            'redux',
            'ultimate',
            'definitive',
            'edition',
            'port',
            're-release',
            'reissue',
          ];

          const nameContainsDisallowed = disallowedNameTokens.some((t) => dNameNorm.includes(t) || dSlugNorm.includes(t) || dDescNorm.includes(t));

          // check tags from details (if present)
          const tagsList: string[] = [];
          if ((details as any)?.tags && Array.isArray((details as any).tags)) {
            for (const t of (details as any).tags) {
              if (t?.slug) tagsList.push(String(t.slug).toLowerCase());
              if (t?.name) tagsList.push(String(t.name).toLowerCase());
            }
          }

          const tagContainsDisallowed = tagsList.some((t) => disallowedTagTokens.some((d) => t.includes(d)));
          const tagContainsRemake = tagsList.some((t) => disallowedRemakeTokens.some((d) => t.includes(d)));

          if (nameContainsDisallowed || tagContainsDisallowed) {
            // skip clearly unofficial/fan entries
            continue;
          }

          // Skip remakes/remasters/ports unless the result matches aliases/franchise slug exactly (rare)
          const isRemakeLike = disallowedRemakeTokens.some((d) => dNameNorm.includes(d) || dSlugNorm.includes(d) || dDescNorm.includes(d)) || tagContainsRemake;

          const detailsMatch =
            aliasesNorm.some((a) => a && (dNameNorm.includes(a) || dSlugNorm.includes(a) || dDescNorm.includes(a))) ||
            franchiseTerms.filter((term) => dNameNorm.includes(term) || dSlugNorm.includes(term) || dDescNorm.includes(term)).length >=
              Math.min(2, franchiseTerms.length);
          if (detailsMatch || (franchiseNorm && dSlugNorm.includes(franchiseNorm))) {
            if (isRemakeLike) {
              // prefer to skip remakes/ports/re-releases
              continue;
            }
            // merge richer details when available
            filtered.push({ ...result, ...(details ?? {}) });
            continue;
          }
        } catch (err) {
          // ignore detail fetch errors and skip more expensive checks if they fail
        }
      }

  // For results missing release info, try to fetch full game details to get accurate release dates
  const enriched: RawgGameResult[] = [];

  console.log('[RAWG franchise match]', {
    franchise: config.name,
    candidateCount: seen.size,
    matchedCount: filtered.length,
  });

  for (const r of filtered) {
    let res = r;
    const hasValidDate = !!(r.released && !Number.isNaN(new Date(r.released).getTime()));
    if (!hasValidDate && r.id) {
      try {
        const details = await fetchRawgGameDetails(r.id);
        if (details) {
          res = { ...r, ...details };
        }
      } catch (err) {
        // ignore
      }
    }
    enriched.push(res);
  }

  // Sort by release date; unknown dates go to the end
  return enriched.sort((a, b) => {
    const aDate = a.released ? new Date(a.released).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.released ? new Date(b.released).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}
