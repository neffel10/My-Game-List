import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL ?? '';

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  throw new Error(
    'DATABASE_URL is missing or invalid. Use a standard Postgres connection string such as postgresql://user:password@host:5432/dbname?sslmode=require. Do not use prisma:// unless you intentionally configured Prisma Accelerate.'
  );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;