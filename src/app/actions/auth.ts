'use server';

import { prisma } from '@/lib/prisma';
import { signIn } from '@/auth';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';

export async function registerUser(formData: FormData) {
  const gamertag = String(formData.get('gamertag') || '').trim();
  const email = String(formData.get('email') || '').toLowerCase().trim();
  const password = String(formData.get('password') || '');

  if (!gamertag || !email || !password) {
    return { error: 'All fields are required' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  // Validar duplicados en Neon
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { gamertag }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) return { error: 'Email already registered' };
    return { error: 'Gamertag already taken' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      gamertag,
      email,
      passwordHash,
      image: '/images/avatars/default.png',
      rank: 'NOVICE',
    },
  });

  return { success: true, userId: newUser.id };
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get('email') || '').toLowerCase().trim();
  const password = String(formData.get('password') || '');

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' };
    }
    return { error: 'Something went wrong. Try again.' };
  }
}