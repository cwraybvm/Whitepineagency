import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maybeAdvanceMany } from '@/lib/sandboxAutoFulfill';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  try {
    const assets = await prisma.creativeAsset.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : { status: { in: ['STAGED', 'PRODUCTION'] } }),
      },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const advanced = await maybeAdvanceMany(assets);
    return NextResponse.json(advanced);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// `x-sandbox-auto-fulfill: true` opts this asset into the on-demand
// auto-advance engine (src/lib/sandboxAutoFulfill.ts) — everything created
// without it behaves exactly as before, fully manual.
export async function POST(req: Request) {
  try {
    const { title, type, content, metadata } = await req.json();

    if (!title || !type || !content) {
      return NextResponse.json({ error: 'title, type, and content are required' }, { status: 400 });
    }

    const autoFulfillHeader = req.headers.get('x-sandbox-auto-fulfill') === 'true';
    const mergedMetadata = autoFulfillHeader
      ? { ...(metadata ?? {}), autoFulfill: true }
      : metadata;

    const asset = await prisma.creativeAsset.create({
      data: { title, type, content, metadata: mergedMetadata, status: 'STAGED' },
    });

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save asset' }, { status: 500 });
  }
}
