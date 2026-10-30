import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProfileView, { AvatarItem } from '@/components/profile/ProfileView';
import { FREE_AVATARS, getRankProgress } from '@/lib/gamification';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const existingFreeAvatarKeys = new Set((await prisma.unlockableAvatar.findMany({
    where: { catalogKey: { in: FREE_AVATARS.map((avatar) => avatar.catalogKey) } },
    select: { catalogKey: true },
  })).flatMap((avatar) => avatar.catalogKey ? [avatar.catalogKey] : []));
  const missingFreeAvatars = FREE_AVATARS.filter((avatar) => !existingFreeAvatarKeys.has(avatar.catalogKey));
  if (missingFreeAvatars.length > 0) {
    await prisma.unlockableAvatar.createMany({
      data: missingFreeAvatars.map((avatar) => ({ ...avatar, isFree: true })),
      skipDuplicates: true,
    });
  }

  // 1. Obtener usuario con su progreso y desbloqueos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      progress: {
        include: { evidence: true },
      },
      unlockedAvatars: true,
    },
  });

  if (!user) {
    redirect('/');
  }

  // 2. Obtener todos los avatares existentes en el juego
  const allAvatars = await prisma.unlockableAvatar.findMany({
    include: {
      franchise: true,
      games: true,
    },
  });

  const unlockedAvatarIds = new Set(user.unlockedAvatars.map((u) => u.avatarId));

  // 3. Formatear lista de avatares
  const formattedAvatars: AvatarItem[] = allAvatars.map((av) => ({
    id: av.id,
    title: av.title,
    imageUrl: av.imageUrl,
    isUnlocked: av.isFree || unlockedAvatarIds.has(av.id),
    requiredMaster: av.requiredMaster,
    isFree: av.isFree,
    franchiseName: av.franchise?.name ?? 'Starter collection',
    unlockedGameTitle: av.games.length > 0 ? av.games[0].title : undefined,
  }));

  // 4. Calcular estadísticas
  const approvedProgress = user.progress.filter((progress) =>
    progress.evidence?.status === 'APPROVED' || progress.evidence?.status === 'MASTERED_APPROVED'
  );
  const totalBeat = approvedProgress.length;
  const totalMastered = approvedProgress.filter((progress) => progress.evidence?.masteredApproved).length;
  const totalVerified = approvedProgress.length;
  const now = new Date();
  await prisma.pointAward.updateMany({
    where: { userId, creditedAt: null, availableAt: { gt: now } },
    data: { availableAt: now },
  });
  await prisma.pointAward.updateMany({
    where: { userId, creditedAt: null, availableAt: { lte: now } },
    data: { creditedAt: now },
  });
  const creditedAwards = await prisma.pointAward.aggregate({
    where: { userId, availableAt: { lte: now } },
    _sum: { points: true },
  });
  const totalPoints = creditedAwards._sum.points ?? 0;
  const rankProgress = getRankProgress(totalPoints);
  const rank = rankProgress.current.name.toUpperCase();

  if (user.rank !== rank || user.totalPoints !== totalPoints) {
    await prisma.user.update({ where: { id: userId }, data: { rank, totalPoints } });
  }

  const formattedUser = {
    id: user.id,
    gamertag: user.gamertag,
    email: user.email,
    image: user.image || '/images/avatars/default.png',
    rank,
    totalPoints,
    rankProgress: rankProgress.progress,
    nextRank: rankProgress.next?.name ?? null,
    pointsToNextRank: rankProgress.pointsToNext,
    rankBadge: rankProgress.current.badge,
    rankColor: rankProgress.current.color,
    createdAt: new Date(user.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
  };

  return (
    <ProfileView
      user={formattedUser}
      stats={{
        totalBeat,
        totalMastered,
        totalVerified,
        totalGamesTracked: user.progress.length,
      }}
      avatars={formattedAvatars}
    />
  );
}