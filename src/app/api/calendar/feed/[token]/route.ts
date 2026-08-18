import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildIcsCalendar } from '@/lib/ics';

export const dynamic = 'force-dynamic';

// No cookie/session auth here -- external calendar apps (Google/Apple/Outlook)
// poll this URL directly with no way to send our session cookie. The token
// path segment is the credential; it's checked against CALENDAR_FEED_TOKEN.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const expected = process.env.CALENDAR_FEED_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { scheduledAt: { not: null } },
    orderBy: { scheduledAt: 'asc' },
  });

  const events = tasks.map((t) => {
    const start = t.scheduledAt!;
    const end = new Date(start.getTime() + (t.estimatedMinutes ?? 30) * 60_000);
    return { uid: `task-${t.id}@whitepineportal`, title: t.title, start, end };
  });

  const ics = buildIcsCalendar(events);
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="tasks.ics"',
    },
  });
}
