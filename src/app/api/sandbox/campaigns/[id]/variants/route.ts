import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { headline, spend, impressions, clicks, conversions } = await req.json();

    if (!headline) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
    }

    const variant = await prisma.campaignVariant.create({
      data: {
        campaignId: id,
        headline,
        spend: spend ?? 0,
        impressions: impressions ?? 0,
        clicks: clicks ?? 0,
        conversions: conversions ?? 0,
      },
    });
    return NextResponse.json(variant, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create variant' }, { status: 500 });
  }
}
