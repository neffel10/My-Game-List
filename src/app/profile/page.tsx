import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProfileView, { AvatarItem } from '@/components/profile/ProfileView';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

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
    isUnlocked: unlockedAvatarIds.has(av.id),
    requiredMaster: av.requiredMaster,
    franchiseName: av.franchise.name,
    unlockedGameTitle: av.games.length > 0 ? av.games[0].title : undefined,
  }));

  // 4. Calcular estadísticas
  const totalBeat = user.progress.filter((p) => p.completed).length;
  const totalMastered = user.progress.filter((p) => p.mastered).length;
  const totalVerified = user.progress.filter((p) => p.evidence?.status === 'APPROVED').length;
  const totalPoints = (totalBeat * 50) + (totalMastered * 120) + (totalVerified * 25);

  const formattedUser = {
    id: user.id,
    gamertag: user.gamertag,
    email: user.email,
    image: user.image || '/images/avatars/default.png',
    rank: user.rank,
    totalPoints,
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