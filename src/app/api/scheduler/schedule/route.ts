import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOrgMember } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

const PLATFORMS = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X_TWITTER'];

export async function POST(req: Request) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, content, mediaUrl, scheduledFor } = (await req.json().catch(() => ({}))) as {
    platform?: string;
    content?: string;
    mediaUrl?: string;
    scheduledFor?: string;
  };
  if (!platform || !PLATFORMS.includes(platform) || !content?.trim() || !scheduledFor) {
    return NextResponse.json({ error: 'platform, content, and scheduledFor are required' }, { status: 400 });
  }
  const scheduledForDate = new Date(scheduledFor);
  if (Number.isNaN(scheduledForDate.getTime())) {
    return NextResponse.json({ error: 'scheduledFor must be a valid date' }, { status: 400 });
  }

  const post = await prisma.scheduledPost.create({
    data: {
      organizationId: auth.organizationId,
      platform,
      content,
      mediaUrl: mediaUrl || null,
      scheduledFor: scheduledForDate,
      status: 'SCHEDULED',
    },
  });

  return NextResponse.json(post);
}
