import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

// Logged by the tasks page when Focus Mode closes -- feeds the Bingo
// FOCUS_SESSION_COUNT / FOCUS_MINUTES goals. Not tied to client billing.
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Empty or malformed body -- a client-input problem, not a server fault.
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  const { durationSeconds } = (body ?? {}) as { durationSeconds?: unknown };
  if (typeof durationSeconds !== 'number' || durationSeconds <= 0) {
    return NextResponse.json({ error: 'durationSeconds must be a positive number' }, { status: 400 });
  }

  const session = await prisma.focusSession.create({ data: { durationSeconds } });
  return NextResponse.json(session, { status: 201 });
}
