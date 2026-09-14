'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function equipAvatar(avatarId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const userId = session.user.id;

  // 1. Validar que el usuario tenga desbloqueado dicho avatar
  const unlocked = await prisma.userUnlockedAvatar.findUnique({
    where: {
      userId_avatarId: {
        userId,
        avatarId,
      },
    },
    include: {
      avatar: true,
    },
  });

  if (!unlocked) {
    return { error: 'This avatar is locked. Complete its challenge first!' };
  }

  // 2. Actualizar la imagen del usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      image: unlocked.avatar.imageUrl,
    },
  });

  revalidatePath('/profile');
  revalidatePath('/', 'layout');

  return { success: true, imageUrl: unlocked.avatar.imageUrl };
}