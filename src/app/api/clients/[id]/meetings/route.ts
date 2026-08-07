import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const meetings = await prisma.clientMeeting.findMany({
    where: { organizationId: id },
    orderBy: { meetingDate: 'desc' },
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { title, meetingDate, attendees, bodyMarkdown, billableHours } = await req.json();

  if (!title || !meetingDate) {
    return NextResponse.json({ error: 'Title and meeting date are required' }, { status: 400 });
  }

  const meeting = await prisma.clientMeeting.create({
    data: {
      organizationId: id,
      title,
      meetingDate: new Date(meetingDate),
      attendees: Array.isArray(attendees) ? attendees : [],
      bodyMarkdown: bodyMarkdown || '',
      billableHours: billableHours ?? 0,
    },
  });
  return NextResponse.json(meeting, { status: 201 });
}
