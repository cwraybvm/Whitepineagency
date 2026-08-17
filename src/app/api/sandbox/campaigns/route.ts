import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(campaigns);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load campaigns' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, organizationId } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const campaign = await prisma.campaign.create({
      data: { name, organizationId: organizationId || null },
      include: { variants: true },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}
