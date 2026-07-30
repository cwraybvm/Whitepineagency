import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const pendingPosts = await prisma.contentPost.findMany({
      where: {
        organizationId,
        status: { in: ['PENDING_APPROVAL', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pendingPosts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pending approvals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { postId, action, approvalNotes } = await req.json();

    if (!postId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'postId and valid action (APPROVE or REJECT) required' }, { status: 400 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedPost = await prisma.contentPost.update({
      where: { id: postId },
      data: {
        status: newStatus,
        approvalNotes: approvalNotes || null,
      },
    });

    return NextResponse.json(updatedPost);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval action failed' }, { status: 500 });
  }
}