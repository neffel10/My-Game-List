'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function toggleUserGameProgress(
  gameId: string,
  field: 'completed' | 'mastered',
  currentCompleted: boolean,
  currentMastered: boolean
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized. Please sign in to save progress.' };
  }

  const userId = session.user.id;

  let nextCompleted = currentCompleted;
  let nextMastered = currentMastered;

  if (field === 'completed') {
    nextCompleted = !currentCompleted;
    if (!nextCompleted) nextMastered = false;
  } else if (field === 'mastered') {
    nextMastered = !currentMastered;
    if (nextMastered) nextCompleted = true;
  }

  // Upsert en la tabla UserGameProgress
  const progress = await prisma.userGameProgress.upsert({
    where: {
      userId_gameId: {
        userId,
        gameId,
      },
    },
    update: {
      completed: nextCompleted,
      mastered: nextMastered,
    },
    create: {
      userId,
      gameId,
      completed: nextCompleted,
      mastered: nextMastered,
    },
    include: {
      game: {
        include: {
          rewardAvatar: true,
        },
      },
    },
  });

  // Verificar si desbloqueó un avatar asociado
  let unlockedAvatarTitle: string | null = null;
  const rewardAvatar = progress.game.rewardAvatar;

  if (rewardAvatar) {
    const meetsCondition = rewardAvatar.requiredMaster ? nextMastered : nextCompleted;
    if (meetsCondition) {
      const alreadyUnlocked = await prisma.userUnlockedAvatar.findUnique({
        where: {
          userId_avatarId: {
            userId,
            avatarId: rewardAvatar.id,
          },
        },
      });

      if (!alreadyUnlocked) {
        await prisma.userUnlockedAvatar.create({
          data: {
            userId,
            avatarId: rewardAvatar.id,
          },
        });
        unlockedAvatarTitle = rewardAvatar.title;
      }
    }
  }

  revalidatePath('/franchises/[slug]', 'page');

  return {
    success: true,
    completed: nextCompleted,
    mastered: nextMastered,
    unlockedAvatarTitle,
  };
}