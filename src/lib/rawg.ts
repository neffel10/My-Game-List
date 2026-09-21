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

function tokenizeForMatch(s?: string) {
  if (!s) return [];
  return stripDiacritics(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

const MATCH_STOP_WORDS = new Set(['the', 'of', 'and', 'game', 'games', 'series']);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    ...[config.name, ...config.aliases],
    ...[config.name, ...config.aliases].flatMap((value) => getSearchTerms(value)),
    ...config.fallbackGames.map((g) => g.title),
  ].filter((query, index, values): query is string => Boolean(query) && values.indexOf(query) === index);
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

  // Rank candidates instead of accepting every partial text match. RAWG contains
  // unrelated games, fan projects and regional variants with the same keywords.
  const franchiseNorm = normalizeForMatch(config.slug);
  const aliasesNorm = [config.name, ...config.aliases]
    .flatMap((value) => getSearchTerms(value))
    .filter(Boolean);
  const franchiseTokens = [...new Set(
    [config.name, ...config.aliases].flatMap(tokenizeForMatch),
  )].filter((token) => !MATCH_STOP_WORDS.has(token));
  const franchiseTokenGroups = [...new Set([config.name, ...config.aliases])]
    .map((value) => tokenizeForMatch(value).filter((token) => !MATCH_STOP_WORDS.has(token)))
    .filter((tokens) => tokens.length > 0);
  const canonicalTitles = config.fallbackGames.map((game) => ({
    normalized: normalizeForMatch(game.title),
    title: game.title,
  }));
  const hardRejectTokens = [
    'fanmade', 'fangame', 'prototype', 'unofficial', 'bootleg', 'romhack',
    'hack', 'translation', 'leak', 'unreleased', 'notpokemon', 'definitelynot',
  ];
  const softRejectTokens = [
    'great', 'rise', 'new saga', 'collection', 'compilation', 'remake',
    'remaster', 'remastered', 'anniversary', 'redux', 'ultimate', 'definitive',
    'edition', 'port', 're-release', 'reissue', 'mobile', 'slot',
  ];
  const scoredCandidates: Array<{ candidate: RawgGameResult; score: number; reasons: string[] }> = [];

  for (const result of seen.values()) {
    const title = result.name ?? '';
    const slug = result.slug ?? '';
    if (isBlacklistedGameMatch(config.slug, title, slug, blacklistedGames)) continue;

    const nameNorm = normalizeForMatch(title);
    const slugNorm = normalizeForMatch(slug);
    const titleTokens = tokenizeForMatch(title);
    const slugTokens = tokenizeForMatch(slug);
    const searchableTokens = new Set([...titleTokens, ...slugTokens]);
    const reasons: string[] = [];
    let score = 0;

    const exactCanonical = canonicalTitles.some((game) => game.normalized === nameNorm || game.normalized === slugNorm);
    const matchingAliases = aliasesNorm.filter((alias) => nameNorm.includes(alias) || slugNorm.includes(alias));
    const matchingTokens = franchiseTokens.filter((token) => searchableTokens.has(token));
    const coreTokenMatches = franchiseTokens.filter((token) => token.length >= 5 && searchableTokens.has(token));
    const startsWithCoreToken = coreTokenMatches.some((token) => titleTokens[0] === token);
    const completeFranchiseMatch = franchiseTokenGroups.some((group) =>
      group.length > 1 && group.every((token) => searchableTokens.has(token))
    );
    const hasMultiWordFranchise = franchiseTokenGroups.some((group) => group.length > 1);
    const phraseMatch = [config.name, ...config.aliases].some((alias) => {
      const phrase = stripDiacritics(alias).toLowerCase().trim();
      return phrase.length > 3 && new RegExp(`^${escapeRegExp(phrase)}(?:\\s|:|-|$)`, 'i').test(stripDiacritics(title).toLowerCase());
    });
    const hasFranchiseInSlug = Boolean(franchiseNorm && slugNorm.includes(franchiseNorm));

    if (exactCanonical) {
      score += 100;
      reasons.push('canonicalTitle');
    }
    if (phraseMatch) {
      score += 45;
      reasons.push('titleStartsWithFranchise');
    } else if (matchingAliases.length > 0 || hasFranchiseInSlug) {
      score += 25;
      reasons.push('partialFranchiseMatch');
    }
    if (matchingTokens.length >= Math.min(2, franchiseTokens.length)) {
      score += 15;
      reasons.push('multipleFranchiseTokens');
    }
    if (completeFranchiseMatch) {
      score += 35;
      reasons.push('allFranchiseWordsMatch');
    }
    if (startsWithCoreToken && matchingTokens.length === 1) {
      score += 25;
      reasons.push('startsWithCoreFranchiseToken');
    }
    if (/\b(?:[0-9]+|i{1,3}|iv|v|vi|vii|viii|ix|x)\b/i.test(title)) {
      score += 15;
      reasons.push('numberedInstallment');
    }
    if (result.released) score += 5;

    const hardRejectFound = hardRejectTokens.filter((token) => nameNorm.includes(token) || slugNorm.includes(token));
    const softRejectFound = softRejectTokens.filter((token) => nameNorm.includes(normalizeForMatch(token)) || slugNorm.includes(normalizeForMatch(token)));
    if (hardRejectFound.length > 0) {
      score -= 100;
      reasons.push(`hardReject:${hardRejectFound.join(',')}`);
    }
    if (softRejectFound.length > 0 && !exactCanonical) {
      score -= 35;
      reasons.push(`variant:${softRejectFound.join(',')}`);
    }

    // A single generic keyword is not enough. This is what previously admitted
    // titles such as "Great Witcher" into the franchise.
    // Multi-word franchises must match every meaningful word. Matching only
    // "war" must never import unrelated titles such as "Jungle Heat: War of Clans".
    if (hasMultiWordFranchise && !exactCanonical && !completeFranchiseMatch) continue;

    const hasStrongTextMatch = exactCanonical || phraseMatch || hasFranchiseInSlug || startsWithCoreToken || completeFranchiseMatch;
    if (!hasStrongTextMatch && matchingTokens.length < 2) continue;
    if (score < 35) continue;

    scoredCandidates.push({ candidate: result, score, reasons });
  }

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.candidate.released ? new Date(a.candidate.released).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.candidate.released ? new Date(b.candidate.released).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });

  const filtered: RawgGameResult[] = [];
  for (const scored of scoredCandidates.slice(0, 75)) {
    let candidate = scored.candidate;

    // Fetch details only for accepted candidates. Besides reducing API calls,
    // this lets official developer/publisher data improve borderline matches.
    if (candidate.id && scored.score < 70) {
      const details = await fetchRawgGameDetails(candidate.id);
      if (details) {
        const detailText = `${details.name ?? ''} ${details.slug ?? ''} ${details.description_raw ?? ''}`.toLowerCase();
        if (hardRejectTokens.some((token) => detailText.includes(token))) continue;
        candidate = { ...candidate, ...details };
      }
    }

    console.log('[RAWG scored candidate]', {
      franchise: config.name,
      name: candidate.name,
      slug: candidate.slug,
      score: scored.score,
      reasons: scored.reasons,
      released: candidate.released,
    });
    filtered.push(candidate);
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
      } catch {
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
