import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function PATCH(req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { meetingId } = await params;
  const body = await req.json();
  const { title, meetingDate, attendees, bodyMarkdown, billableHours } = body;

  const meeting = await prisma.clientMeeting.update({
    where: { id: meetingId },
    data: {
      ...(title !== undefined && { title }),
      ...(meetingDate !== undefined && { meetingDate: new Date(meetingDate) }),
      ...(attendees !== undefined && { attendees }),
      ...(bodyMarkdown !== undefined && { bodyMarkdown }),
      ...(billableHours !== undefined && { billableHours }),
    },
  });
  return NextResponse.json(meeting);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { meetingId } = await params;
  await prisma.clientMeeting.delete({ where: { id: meetingId } });
  return NextResponse.json({ success: true });
}
