import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ redemptionId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Sign in to download this reward.' }, { status: 401 });

  const { redemptionId } = await params;
  const redemption = await prisma.rewardRedemption.findFirst({
    where: { id: redemptionId, userId },
    select: {
      reward: {
        select: { title: true, deliveryType: true, digitalAssetUrl: true },
      },
    },
  });
  if (!redemption || redemption.reward.deliveryType !== 'DIGITAL_DOWNLOAD' || !redemption.reward.digitalAssetUrl) {
    return NextResponse.json({ error: 'The redeemed download was not found.' }, { status: 404 });
  }

  const asset = await fetch(redemption.reward.digitalAssetUrl, { cache: 'no-store' });
  if (!asset.ok || !asset.body) {
    return NextResponse.json({ error: 'The digital reward file is temporarily unavailable.' }, { status: 502 });
  }

  const contentType = asset.headers.get('content-type') ?? 'application/octet-stream';
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${redemption.reward.title.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'digital-reward'}.${extension}`;
  return new Response(asset.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
