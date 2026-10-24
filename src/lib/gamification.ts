export const RANKS = [
  { name: 'Novice', min: 0, max: 599, badge: 'Bronze', color: '#CD7F32' },
  { name: 'Enthusiast', min: 600, max: 1000, badge: 'Silver', color: '#C0C7D1' },
  { name: 'Advanced', min: 1001, max: 2000, badge: 'Gold', color: '#FED140' },
  { name: 'Pro', min: 2001, max: 5000, badge: 'Platinum', color: '#9BD8F5' },
  { name: 'Master', min: 5001, max: Number.POSITIVE_INFINITY, badge: 'Diamond', color: '#C39BFF' },
] as const;

export function getRankProgress(points: number) {
  const rankIndex = RANKS.findIndex((rank) => points <= rank.max);
  const currentIndex = Math.max(rankIndex, 0);
  const current = RANKS[currentIndex];
  const next = RANKS[currentIndex + 1] ?? null;

  return {
    current,
    next,
    progress: next
      ? Math.min(100, Math.max(0, ((points - current.min) / (next.min - current.min)) * 100))
      : 100,
    pointsToNext: next ? Math.max(0, next.min - points) : 0,
  };
}

export function getEvidencePointsAvailableAt(submittedAt: Date, reviewedAt: Date) {
  const delayExpiresAt = submittedAt.getTime() + 24 * 60 * 60 * 1000;
  return new Date(Math.max(delayExpiresAt, reviewedAt.getTime()));
}

export const FREE_AVATARS = Array.from({ length: 10 }, (_, index) => ({
  catalogKey: `free-generic-${String(index + 1).padStart(2, '0')}`,
  title: `Starter Avatar ${String(index + 1).padStart(2, '0')}`,
  imageUrl: `/images/avatars/generic-${String(index + 1).padStart(2, '0')}.svg`,
}));
