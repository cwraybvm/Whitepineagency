import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  GOAL_POOLS,
  getSeedKey,
  getPeriodRange,
  getBefore10amCutoff,
  pickTiles,
  type BingoPeriod,
  type BingoMetric,
  type GoalTemplate,
} from '@/lib/bingo';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

function isPeriod(value: unknown): value is BingoPeriod {
  return value === 'DAILY' || value === 'WEEKLY';
}

async function computeCurrent(metric: BingoMetric, start: Date, end: Date): Promise<number> {
  switch (metric) {
    case 'TASK_BEFORE_10AM':
      return prisma.task.count({
        where: { completedAt: { gte: start, lt: getBefore10amCutoff(start) } },
      });
    case 'UNSTICK_COUNT':
      return prisma.task.count({ where: { unstickedAt: { gte: start, lt: end } } });
    case 'FOCUS_SESSION_COUNT':
      return prisma.focusSession.count({ where: { createdAt: { gte: start, lt: end } } });
    case 'FOCUS_MINUTES': {
      const agg = await prisma.focusSession.aggregate({
        where: { createdAt: { gte: start, lt: end } },
        _sum: { durationSeconds: true },
      });
      return Math.floor((agg._sum.durationSeconds ?? 0) / 60);
    }
    case 'TASKS_COMPLETED':
      return prisma.task.count({ where: { completedAt: { gte: start, lt: end } } });
    case 'TASKS_CREATED':
      return prisma.task.count({ where: { createdAt: { gte: start, lt: end } } });
    case 'TASKS_PARKED':
      return prisma.task.count({ where: { parkedAt: { gte: start, lt: end } } });
    case 'ENERGY_TAGGED':
      return prisma.task.count({ where: { energyLevel: { not: null }, updatedAt: { gte: start, lt: end } } });
    case 'HIGH_ENERGY_DONE':
      return prisma.task.count({ where: { energyLevel: 'HIGH', completedAt: { gte: start, lt: end } } });
    case 'FOCUS_TODAY_STARRED':
      return prisma.task.count({ where: { isFocusToday: true, updatedAt: { gte: start, lt: end } } });
  }
}

async function buildBoard(period: BingoPeriod) {
  const now = new Date();
  const seedKey = getSeedKey(period, now);
  const { start, end } = getPeriodRange(period, now);
  const tiles = pickTiles(seedKey, GOAL_POOLS[period]);

  const board = await prisma.bingoBoard.findUnique({ where: { period_seedKey: { period, seedKey } } });
  const manuallyCompleted = new Set<number>(Array.isArray(board?.completedCells) ? (board!.completedCells as number[]) : []);

  const cells = await Promise.all(
    tiles.map(async (tile: GoalTemplate, index: number) => {
      const current = await computeCurrent(tile.metric, start, end);
      return {
        index,
        id: tile.id,
        label: tile.label,
        target: tile.target,
        current: Math.min(current, tile.target),
        completed: current >= tile.target || manuallyCompleted.has(index),
      };
    })
  );

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
