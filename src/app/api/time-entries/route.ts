import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here.
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

// Returns the single currently-running entry (endTime IS NULL), or null.
export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await prisma.timeEntry.findFirst({
    where: { endTime: null },
    orderBy: { startTime: 'desc' },
  });
  return NextResponse.json(active);
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId } = await req.json();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const existing = await prisma.timeEntry.findFirst({ where: { endTime: null } });
  if (existing) {
    return NextResponse.json({ error: 'A timer is already running. Stop it before starting another.' }, { status: 409 });
  }

  const entry = await prisma.timeEntry.create({
    data: { organizationId, startTime: new Date() },
  });
  return NextResponse.json(entry, { status: 201 });
}
