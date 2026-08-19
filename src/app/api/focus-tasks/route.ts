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

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(tasks);
  } catch (err: any) {
    // A Prisma/DB failure here previously fell through to a non-JSON 500 --
    // the board's load() call couldn't parse it and the page silently kept
    // whatever (possibly empty) task list it started with.
    console.error('GET /api/focus-tasks failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, organizationId, dueDate, priority, energyLevel, isParked, estimatedMinutes, isUrgent, isImportant, scheduledAt } = await req.json();
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (priority !== undefined && priority !== null && !Number.isInteger(priority)) {
      return NextResponse.json({ error: 'priority must be an integer' }, { status: 400 });
    }
    if (energyLevel !== undefined && energyLevel !== null && !['LOW', 'MEDIUM', 'HIGH'].includes(energyLevel)) {
      return NextResponse.json({ error: 'energyLevel must be LOW, MEDIUM, or HIGH' }, { status: 400 });
    }

    const scheduledAtDate = scheduledAt ? new Date(scheduledAt) : null;
    const googleCalendarEventId = await syncTaskCalendarEvent({
      existingEventId: null,
      shouldSync: true,
      scheduledAt: scheduledAtDate,
      title,
      estimatedMinutes: estimatedMinutes || null,
    });
    const task = await prisma.task.create({
      data: {
        title,
        // Explicit rather than relying on the Prisma schema default -- a newly
        // created task must never land pre-completed or hidden from the Inbox.
        status: 'INBOX',
        completedAt: null,
        organizationId: organizationId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? 0,
        energyLevel: energyLevel || null,
        isParked: isParked ?? false,
        estimatedMinutes: estimatedMinutes || null,
        isUrgent: isUrgent ?? false,
        isImportant: isImportant ?? false,
        scheduledAt: scheduledAtDate,
        googleCalendarEventId,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    // Previously unhandled -- any Prisma/validation failure here fell through
    // to Next's generic non-JSON 500, which the client's `res.json()` call
    // can't parse, so the toast just said "Could not add task" with no way
    // to tell a real bug from a network blip. Now: logged server-side, and
    // the client gets a message it can actually show.
    console.error('POST /api/focus-tasks failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create task' }, { status: 500 });
  }
}
