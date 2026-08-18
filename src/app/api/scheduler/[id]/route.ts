import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOrgMember } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

const STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.scheduledPost.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const { content, mediaUrl, scheduledFor, status } = (await req.json().catch(() => ({}))) as {
    content?: string;
    mediaUrl?: string | null;
    scheduledFor?: string;
    status?: string;
  };
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (scheduledFor !== undefined && Number.isNaN(new Date(scheduledFor).getTime())) {
    return NextResponse.json({ error: 'scheduledFor must be a valid date' }, { status: 400 });
  }

  const updated = await prisma.scheduledPost.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(scheduledFor !== undefined && { scheduledFor: new Date(scheduledFor) }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.scheduledPost.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  await prisma.scheduledPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
