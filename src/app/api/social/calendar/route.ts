import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const posts = await prisma.contentPost.findMany({
      where: { organizationId },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json(posts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch calendar posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { postId, scheduledAt, platforms, status = 'SCHEDULED' } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const updatedPost = await prisma.contentPost.update({
      where: { id: postId },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        platforms: platforms || [],
        status,
      },
    });

    return NextResponse.json(updatedPost);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update schedule' }, { status: 500 });
  }
}