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

  const avatar = await prisma.unlockableAvatar.findUnique({ where: { id: avatarId } });
  if (!avatar) return { error: 'Avatar not found.' };

  const unlocked = avatar.isFree
    ? true
    : await prisma.userUnlockedAvatar.findUnique({
        where: { userId_avatarId: { userId, avatarId } },
      });
  if (!unlocked) {
    return { error: 'This avatar is locked. Complete its challenge first!' };
  }

  // 2. Actualizar la imagen del usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      image: avatar.imageUrl,
    },
  });

  revalidatePath('/profile');
  revalidatePath('/', 'layout');

  return { success: true, imageUrl: avatar.imageUrl };
}