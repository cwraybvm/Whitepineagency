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
  const { action, description } = await req.json();

  if (action !== 'stop') {
    return NextResponse.json({ error: 'Only the "stop" action is supported' }, { status: 400 });
  }

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
  }
  if (entry.endTime) {
    return NextResponse.json({ error: 'Time entry already stopped' }, { status: 409 });
  }

  const endTime = new Date();
  const durationSeconds = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { endTime, durationSeconds, ...(description ? { description } : {}) },
  });
  return NextResponse.json(updated);
}
