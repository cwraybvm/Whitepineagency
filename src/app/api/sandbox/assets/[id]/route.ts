import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maybeAdvance } from '@/lib/sandboxAutoFulfill';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    const advanced = await maybeAdvance(asset);
    return NextResponse.json(advanced);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load asset' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { organizationId, content, metadata, title } = await req.json();

    const data: Record<string, unknown> = {};
    if (organizationId) {
      data.organizationId = organizationId;
      data.status = 'PRODUCTION';
    }
    if (content !== undefined) {
      data.content = content;
      data.version = { increment: 1 };
    }
    if (metadata !== undefined) {
      data.metadata = metadata;
    } else if (content !== undefined || title !== undefined) {
      // A human edited this asset directly — manual action takes precedence
      // over the on-demand auto-fulfill engine, so stop it from advancing
      // this record further (see src/lib/sandboxAutoFulfill.ts).
      const existing = await prisma.creativeAsset.findUnique({ where: { id }, select: { metadata: true } });
      const existingMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
      if (existingMeta.autoFulfill) {
        data.metadata = { ...existingMeta, autoFulfill: false };
      }
    }
    if (title !== undefined) data.title = title;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const asset = await prisma.creativeAsset.update({ where: { id }, data });

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update asset' }, { status: 500 });
  }
}
