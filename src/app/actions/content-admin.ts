'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToBlob } from '@/lib/blob-upload';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

async function requireAdmin() {
  if (ADMIN_BYPASS_ENABLED) {
    return { user: { email: ADMIN_EMAILS[0] ?? 'admin@mygamelist.local' } };
  }

  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    throw new Error('This action is restricted to administrators.');
  }
  return session;
}

export async function saveFeaturedFanArt(formData: FormData) {
  try {
    await requireAdmin();

    const franchiseId = String(formData.get('franchiseId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const artistName = String(formData.get('artistName') ?? '').trim();
    const month = String(formData.get('month') ?? '').trim();
    const imageFile = formData.get('image');

    if (!franchiseId || !title || !artistName || !month || !(imageFile instanceof File)) {
      throw new Error('Franchise, title, artist, month, and image are required.');
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'fan-art-featured', MAX_IMAGE_SIZE);
    const year = Number(formData.get('year') ?? new Date().getFullYear());

    await prisma.fanArtSubmission.updateMany({
      where: { isFeatured: true },
      data: { isFeatured: false },
    });

    await prisma.fanArtSubmission.create({
      data: {
        franchiseId,
        title,
        artistName,
        imageUrl,
        month,
        year,
        isFeatured: true,
        isActive: true,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('saveFeaturedFanArt failed:', error);
    return;
  }
}

export async function saveFranchiseFanArt(formData: FormData) {
  try {
    await requireAdmin();

    const franchiseId = String(formData.get('franchiseId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const artistName = String(formData.get('artistName') ?? '').trim();
    const month = String(formData.get('month') ?? '').trim();
    const imageFile = formData.get('image');

    if (!franchiseId || !title || !artistName || !month || !(imageFile instanceof File)) {
      console.error('saveFranchiseFanArt validation failed');
      return;
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'fan-art-franchise', MAX_IMAGE_SIZE);
    const year = Number(formData.get('year') ?? new Date().getFullYear());

    await prisma.fanArtSubmission.create({
      data: {
        franchiseId,
        title,
        artistName,
        imageUrl,
        month,
        year,
        isFeatured: false,
        isActive: true,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('saveFranchiseFanArt failed:', error);
    return;
  }
}

export async function saveReward(formData: FormData) {
  try {
    await requireAdmin();

    const title = String(formData.get('title') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const category = String(formData.get('category') ?? 'PHYSICAL').trim();
    const pointsRequired = Number(formData.get('pointsRequired') ?? 0);
    const stock = Number(formData.get('stock') ?? 1);
    const externalLink = String(formData.get('externalLink') ?? '').trim();
    const imageFile = formData.get('image');

    if (!title || !company || !(imageFile instanceof File) || !Number.isFinite(pointsRequired) || pointsRequired <= 0) {
      console.error('saveReward validation failed');
      return;
    }

    const imageUrl = await uploadImageToBlob(imageFile, 'rewards', MAX_IMAGE_SIZE);

    await prisma.reward.create({
      data: {
        title,
        company,
        description: description || null,
        imageUrl,
        pointsRequired,
        stock: Number.isFinite(stock) && stock > 0 ? stock : 1,
        category: category || 'PHYSICAL',
        isActive: true,
        externalLink: externalLink || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/rewards');
    revalidatePath('/admin/content');
  } catch (error) {
    console.error('saveReward failed:', error);
    return;
  }
}

export async function toggleFanArtStatus(id: string, isActive: boolean) {
  try {
    await requireAdmin();
    await prisma.fanArtSubmission.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/fan-art');
  } catch (error) {
    console.error('toggleFanArtStatus failed:', error);
    return;
  }
}

export async function toggleRewardStatus(id: string, isActive: boolean) {
  try {
    await requireAdmin();
    await prisma.reward.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/');
    revalidatePath('/admin/content');
    revalidatePath('/rewards');
  } catch (error) {
    console.error('toggleRewardStatus failed:', error);
    return;
  }
}
