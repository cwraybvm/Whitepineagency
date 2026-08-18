import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { syncTaskCalendarEvent } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here.
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

// Assigns/reschedules a task's date+time and/or flips its Google Calendar
// sync toggle, then reconciles the mirrored Calendar event to match.
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId, scheduledAt, syncToGoogleCalendar } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const nextScheduledAt = scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : existing.scheduledAt;
  const nextShouldSync = syncToGoogleCalendar !== undefined ? !!syncToGoogleCalendar : existing.syncToGoogleCalendar;

  const eventId = await syncTaskCalendarEvent({
    existingEventId: existing.googleCalendarEventId,
    shouldSync: nextShouldSync,
    scheduledAt: nextScheduledAt,
    title: existing.title,
    estimatedMinutes: existing.estimatedMinutes,
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      scheduledAt: nextScheduledAt,
      syncToGoogleCalendar: nextShouldSync,
      googleCalendarEventId: eventId,
    },
  });

  return NextResponse.json(task);
}
