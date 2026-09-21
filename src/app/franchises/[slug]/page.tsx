import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import FranchiseChecklistView, { ClientCategory } from '@/components/franchise/FranchiseChecklistView';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? 'admin@mygamelist.local')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_BYPASS_ENABLED = (process.env.ADMIN_BYPASS ?? 'true').toLowerCase() === 'true';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FranchisePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = ADMIN_BYPASS_ENABLED || (!!session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase()));

  // 1. Obtener la franquicia con categorías, juegos y evidencias
  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { orderIndex: 'asc' },
        include: {
          games: {
            orderBy: { year: 'asc' },
            include: {
              progress: userId
                ? {
                    where: { userId },
                    include: { evidence: true },
                  }
                : false,
            },
          },
        },
      },
      fanArts: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!franchise) {
    notFound();
  }

  // 2. Mapear respetando los checks guardados del usuario
  const initialCategories: ClientCategory[] = franchise.categories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    games: cat.games.map((g) => {
        const userProg =
          g.progress && g.progress.length > 0
            ? (g.progress[0] as (typeof g.progress)[number] & {
                evidence?: { status: string } | null;
              })
            : null;

        let evidenceStatus: 'none' | 'pending' | 'verified' | 'rejected' = 'none';
        if (userProg?.evidence) {
          evidenceStatus = userProg.evidence.status.toLowerCase() as 'pending' | 'verified' | 'rejected';
        }

          return {
        id: g.id,
        title: g.title,
        year: g.year,
          rawgSlug: g.rawgSlug,
          platforms: g.platforms ?? [],
          completed: userProg?.completed ?? false,
          mastered: userProg?.mastered ?? false,
          progressId: userProg?.id ?? null,
          evidenceStatus,
        };
    }),
  }));

  const coverArtistName = franchise.fanArts[0]?.artistName ?? null;

  return (
    <FranchiseChecklistView
      franchiseName={franchise.name}
      coverImage={franchise.coverImage}
      coverArtistName={coverArtistName}
      franchiseSlug={franchise.slug}
      isAdmin={isAdmin}
      franchiseId={franchise.id}
      initialCategories={initialCategories}
    />
  );
}