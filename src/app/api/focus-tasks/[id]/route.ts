import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { deleteCalendarEvent } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here.
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, status, priority, dueDate, isFocusToday, focusOrder, subtasks, energyLevel, isParked, estimatedMinutes, isUrgent, isImportant } = body;

    // Checking a task off removes its mirrored Calendar event rather than
    // leaving a stale event behind on a task that's no longer scheduled work.
    let clearCalendarEventId = false;
    if (status === 'DONE') {
      const existing = await prisma.task.findUnique({ where: { id }, select: { googleCalendarEventId: true } });
      if (existing?.googleCalendarEventId) {
        await deleteCalendarEvent(existing.googleCalendarEventId).catch((err) =>
          console.error('Google Calendar event delete failed:', err)
        );
        clearCalendarEventId = true;
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status, completedAt: status === 'DONE' ? new Date() : null }),
        ...(clearCalendarEventId && { googleCalendarEventId: null }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isFocusToday !== undefined && { isFocusToday }),
        ...(focusOrder !== undefined && { focusOrder }),
        ...(subtasks !== undefined && { subtasks }),
        ...(energyLevel !== undefined && { energyLevel }),
        ...(isParked !== undefined && { isParked, ...(isParked ? { parkedAt: new Date() } : {}) }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(isUrgent !== undefined && { isUrgent }),
        ...(isImportant !== undefined && { isImportant }),
      },
    });
    return NextResponse.json(task);
  } catch (err: any) {
    console.error(`PATCH /api/focus-tasks/${id} failed:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.task.findUnique({ where: { id }, select: { googleCalendarEventId: true } });
    if (existing?.googleCalendarEventId) {
      await deleteCalendarEvent(existing.googleCalendarEventId).catch((err) =>
        console.error('Google Calendar event delete failed:', err)
      );
    }
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`DELETE /api/focus-tasks/${id} failed:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to delete task' }, { status: 500 });
  }
}
