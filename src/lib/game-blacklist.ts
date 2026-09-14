import { prisma } from '@/lib/prisma';

const gameBlacklistModel = (prisma as any).gameBlacklist ?? (prisma as any).blacklistedGame;

export function getGameBlacklistModel() {
  return gameBlacklistModel;
}

export type BlacklistedGameEntry = {
  franchiseSlug: string;
  rawgSlug: string | null;
  title: string;
};

function normalizeBlacklistToken(value?: string | null) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export async function getBlacklistedGamesForFranchise(franchiseSlug: string) {
  const blacklistModel = getGameBlacklistModel();
  if (!blacklistModel) {
    return [];
  }

  return blacklistModel.findMany({
    where: { franchiseSlug },
    orderBy: { createdAt: 'desc' },
  });
}

export function isBlacklistedGameMatch(
  franchiseSlug: string,
  gameTitle: string,
  rawgSlug?: string | null,
  blacklisted: BlacklistedGameEntry[] = []
) {
  const normalizedTitle = normalizeBlacklistToken(gameTitle);
  const normalizedRawgSlug = normalizeBlacklistToken(rawgSlug);

  return blacklisted.some((entry) => {
    if (entry.franchiseSlug !== franchiseSlug) return false;
    if (entry.rawgSlug && normalizedRawgSlug && normalizeBlacklistToken(entry.rawgSlug) === normalizedRawgSlug) {
      return true;
    }
    if (entry.title && normalizedTitle && normalizeBlacklistToken(entry.title) === normalizedTitle) {
      return true;
    }
    return false;
  });
}
