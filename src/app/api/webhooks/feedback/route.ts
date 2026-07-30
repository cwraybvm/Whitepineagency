import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Parse visual feedback payload (supports Marker.io, Bugherd, or direct portal submissions)
    const {
      organizationId = 'default-org',
      title,
      comment,
      reporterName,
      screenshotUrl,
      targetUrl,
      browserInfo,
    } = body;

    if (!title && !comment) {
      return NextResponse.json({ error: 'Feedback title or comment required' }, { status: 400 });
    }

    // Find the default "To Do" or first task column for this organization
    let column = await prisma.taskColumn.findFirst({
      where: { organizationId },
      orderBy: { orderPosition: 'asc' },
    });

    // Fallback column creation if none exists
    if (!column) {
      column = await prisma.taskColumn.create({
        data: {
          organizationId,
          title: 'To Do',
          orderPosition: 0,
        },
      });
    }

    // Build structured description with screenshot & browser metadata
    const description = [
      `**Feedback:** ${comment || title}`,
      `**Reported By:** ${reporterName || 'Client'}`,
      targetUrl ? `**Page URL:** [${targetUrl}](${targetUrl})` : null,
      browserInfo ? `**Device/Browser:** ${browserInfo}` : null,
      screenshotUrl ? `\n![Screenshot](${screenshotUrl})` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Create the task card on your Kanban board
    const taskCard = await prisma.taskCard.create({
      data: {
        organizationId,
        columnId: column.id,
        title: `🎨 Visual Feedback: ${title || 'Client Design Note'}`,
        description,
        tagLabel: 'Visual Proofing',
        tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      },
    });

    return NextResponse.json({ success: true, taskCard });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Feedback webhook failed' }, { status: 500 });
  }
}