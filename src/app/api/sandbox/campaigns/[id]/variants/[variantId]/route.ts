import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const body = await req.json();
  const { headline, spend, impressions, clicks, conversions } = body;

  const variant = await prisma.campaignVariant.update({
    where: { id: variantId },
    data: {
      ...(headline !== undefined && { headline }),
      ...(spend !== undefined && { spend }),
      ...(impressions !== undefined && { impressions }),
      ...(clicks !== undefined && { clicks }),
      ...(conversions !== undefined && { conversions }),
    },
  });
  return NextResponse.json(variant);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  await prisma.campaignVariant.delete({ where: { id: variantId } });
  return NextResponse.json({ success: true });
}
