import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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

  const tasks = await prisma.task.findMany({
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, organizationId, dueDate, priority, energyLevel } = await req.json();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title,
      organizationId: organizationId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? 0,
      energyLevel: energyLevel || null,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
