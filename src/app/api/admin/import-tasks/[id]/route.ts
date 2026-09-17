import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!ADMIN_BYPASS_ENABLED && ADMIN_EMAILS.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.importTask.findUnique({
    where: { id },
    select: {
      id: true,
      franchiseName: true,
      status: true,
      phase: true,
      progress: true,
      total: true,
      importedGames: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Import task not found.' }, { status: 404 });
  }

  return NextResponse.json(task);
}
