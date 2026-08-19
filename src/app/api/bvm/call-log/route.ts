import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📅 GET: fetch a day's call-consistency grid, defaulting to an empty 45-cell grid
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  try {
    const log = await prisma.bvmCallLog.findUnique({ where: { date } });
    if (log) return NextResponse.json(log);

    return NextResponse.json({
      id: null,
      date,
      cellCount: 45,
      cellData: Array.from({ length: 45 }, (_, i) => ({ cellNumber: i + 1, status: null })),
      leadsAdded: 0,
    });
  } catch (error) {
    // PUT already logs+wraps its own failures; GET didn't, so a transient DB
    // hiccup here fell through to a non-JSON 500 the client's res.json()
    // can't parse, and the load silently failed as an empty/stale grid.
    console.error('BVM call-log GET failed:', error);
    return NextResponse.json({ error: 'Failed to load call log' }, { status: 500 });
  }
}

// 💾 PUT: upsert a day's grid (auto-save on cell change / expander resize)
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date, cellCount, cellData, leadsAdded } = await request.json();

    if (!date || !Array.isArray(cellData)) {
      return NextResponse.json({ error: 'Missing date or cellData' }, { status: 400 });
    }

    const log = await prisma.bvmCallLog.upsert({
      where: { date },
      create: { date, cellCount: cellCount || cellData.length, cellData, leadsAdded: leadsAdded ?? 0 },
      update: { cellCount: cellCount || cellData.length, cellData, ...(leadsAdded !== undefined ? { leadsAdded } : {}) },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('BVM call-log PUT failed:', error);
    return NextResponse.json({ error: 'Failed to save call log' }, { status: 500 });
  }
}
