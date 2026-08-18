import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOrgMember } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const posts = await prisma.scheduledPost.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { scheduledFor: 'asc' },
  });

  return NextResponse.json(posts);
}
