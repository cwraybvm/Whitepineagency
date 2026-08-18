// Prisma-dependent Bingo helpers, split out of lib/bingo.ts -- that module
// is also imported by the client-side DopamineBingoModal, and pulling
// prisma (-> pg -> node fs/net/tls/dns) into it breaks the browser bundle.
// Keep this file server-only (API routes only).
import { prisma } from './prisma';
import { pickTiles, GOAL_POOLS, getBefore10amCutoff, type BingoPeriod, type BingoMetric, type BingoCellStatus } from './bingo';

export async function computeCurrentMetric(metric: BingoMetric, start: Date, end: Date): Promise<number> {
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

export async function computeBoardCells(
  period: BingoPeriod,
  seedKey: string,
  start: Date,
  end: Date,
  manuallyCompleted: Set<number>
): Promise<BingoCellStatus[]> {
  const tiles = pickTiles(seedKey, GOAL_POOLS[period]);
  return Promise.all(
    tiles.map(async (tile, index) => {
      const current = await computeCurrentMetric(tile.metric, start, end);
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
}
