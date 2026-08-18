import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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
  const body = await req.json();
  const { title, status, priority, dueDate, isFocusToday, focusOrder, subtasks, energyLevel, isParked, estimatedMinutes, isUrgent, isImportant } = body;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status, completedAt: status === 'DONE' ? new Date() : null }),
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
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
