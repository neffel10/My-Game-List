import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

function csvValue(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!ADMIN_BYPASS_ENABLED && (!email || !ADMIN_EMAILS.includes(email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;
  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    include: { categories: { include: { games: true } } },
  });
  if (!franchise) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 });

  const rows = ['title,year,releaseDate,platforms,description,category,rawgSlug'];
  for (const category of franchise.categories) {
    for (const game of category.games) {
      rows.push([
        csvValue(game.title),
        csvValue(game.year),
        csvValue(game.releaseDate?.toISOString() ?? ''),
        csvValue(game.platforms.join('|')),
        csvValue(game.description),
        csvValue(category.title),
        csvValue(game.rawgSlug),
      ].join(','));
    }
  }

  return new NextResponse(`\uFEFF${rows.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-games.csv"`,
    },
  });
}
