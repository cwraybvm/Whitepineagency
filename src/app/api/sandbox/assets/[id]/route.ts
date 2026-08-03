import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    if (metadata !== undefined) data.metadata = metadata;
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
