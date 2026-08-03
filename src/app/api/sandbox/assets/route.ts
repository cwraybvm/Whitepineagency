import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    return NextResponse.json(assets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, type, content, metadata } = await req.json();

    if (!title || !type || !content) {
      return NextResponse.json({ error: 'title, type, and content are required' }, { status: 400 });
    }

    const asset = await prisma.creativeAsset.create({
      data: { title, type, content, metadata, status: 'STAGED' },
    });

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save asset' }, { status: 500 });
  }
}
