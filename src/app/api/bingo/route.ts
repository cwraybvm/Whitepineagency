import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSeedKey, getPeriodRange, type BingoPeriod } from '@/lib/bingo';
import { computeBoardCells } from '@/lib/bingoServer';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

function isPeriod(value: unknown): value is BingoPeriod {
  return value === 'DAILY' || value === 'WEEKLY';
}

async function buildBoard(period: BingoPeriod) {
  const now = new Date();
  const seedKey = getSeedKey(period, now);
  const { start, end } = getPeriodRange(period, now);

  const board = await prisma.bingoBoard.findUnique({ where: { period_seedKey: { period, seedKey } } });
  const manuallyCompleted = new Set<number>(Array.isArray(board?.completedCells) ? (board!.completedCells as number[]) : []);

  const cells = await computeBoardCells(period, seedKey, start, end, manuallyCompleted);

  return { period, seedKey, cells };
}

export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = new URL(req.url).searchParams.get('period');
  if (!isPeriod(period)) {
    return NextResponse.json({ error: 'period must be DAILY or WEEKLY' }, { status: 400 });
  }

  return NextResponse.json(await buildBoard(period));
}

export async function PATCH(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { period, cellIndex, completed } = await req.json();
  if (!isPeriod(period) || typeof cellIndex !== 'number' || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'period, cellIndex, and completed are required' }, { status: 400 });
  }

  const seedKey = getSeedKey(period, new Date());
  const existing = await prisma.bingoBoard.findUnique({ where: { period_seedKey: { period, seedKey } } });
  const current = new Set<number>(Array.isArray(existing?.completedCells) ? (existing!.completedCells as number[]) : []);
  if (completed) current.add(cellIndex);
  else current.delete(cellIndex);

  await prisma.bingoBoard.upsert({
    where: { period_seedKey: { period, seedKey } },
    create: { period, seedKey, completedCells: [...current] },
    update: { completedCells: [...current] },
  });

  return NextResponse.json(await buildBoard(period));
}
