import { Prisma } from '@prisma/client';

interface GrantEvidenceRewardsInput {
  userId: string;
  gameId: string;
  masteredApproved: boolean;
  availableAt: Date;
}

export async function grantApprovedEvidenceRewards(
  tx: Prisma.TransactionClient,
  { userId, gameId, masteredApproved, availableAt }: GrantEvidenceRewardsInput,
) {
  await tx.pointAward.upsert({
    where: { userId_gameId_type: { userId, gameId, type: 'GAME_COMPLETED' } },
    update: {},
    create: {
      userId,
      gameId,
      type: 'GAME_COMPLETED',
      points: 100,
      availableAt,
      creditedAt: availableAt,
    },
  });

  if (masteredApproved) {
    await tx.pointAward.upsert({
      where: { userId_gameId_type: { userId, gameId, type: 'GAME_MASTERED_BONUS' } },
      update: {},
      create: {
        userId,
        gameId,
        type: 'GAME_MASTERED_BONUS',
        points: 50,
        availableAt,
        creditedAt: availableAt,
      },
    });
  }

  const rewardAvatar = await tx.unlockableAvatar.findFirst({
    where: {
      games: { some: { id: gameId } },
      OR: [{ requiredMaster: false }, ...(masteredApproved ? [{ requiredMaster: true }] : [])],
    },
  });

  if (rewardAvatar) {
    await tx.userUnlockedAvatar.upsert({
      where: { userId_avatarId: { userId, avatarId: rewardAvatar.id } },
      update: {},
      create: { userId, avatarId: rewardAvatar.id },
    });
  }

  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: {
      subcategory: {
        select: {
          franchiseId: true,
          franchise: { select: { name: true, coverImage: true } },
        },
      },
    },
  });
  if (!game) return;

  const franchiseId = game.subcategory.franchiseId;
  const [franchiseGameCount, approvedGameCount] = await Promise.all([
    tx.game.count({ where: { subcategory: { franchiseId } } }),
    tx.evidenceSubmission.count({
      where: {
        userId,
        status: { in: ['APPROVED', 'MASTERED_APPROVED'] },
        progress: { game: { subcategory: { franchiseId } } },
      },
    }),
  ]);

  if (franchiseGameCount === 0 || approvedGameCount !== franchiseGameCount) return;

  const completionAvatar = await tx.unlockableAvatar.upsert({
    where: { catalogKey: `franchise-completion-${franchiseId}` },
    update: {},
    create: {
      catalogKey: `franchise-completion-${franchiseId}`,
      title: `${game.subcategory.franchise.name} Completion`,
      imageUrl: game.subcategory.franchise.coverImage,
      franchiseId,
      requiredMaster: false,
    },
  });

  await tx.userUnlockedAvatar.upsert({
    where: { userId_avatarId: { userId, avatarId: completionAvatar.id } },
    update: {},
    create: { userId, avatarId: completionAvatar.id },
  });
}
