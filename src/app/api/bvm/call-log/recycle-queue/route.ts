import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

const RECYCLE_STATUSES = new Set(['NA', 'LVM']);
const STALE_DAYS = 7;
const MAX_RESULTS = 100;

// ♻️ GET: aggregate NA/LVM cells from 7+ day old call logs into a
// re-engagement queue for cold prospects that never got a callback.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const logs = await prisma.bvmCallLog.findMany({
    where: { date: { lte: cutoffStr } },
    orderBy: { date: 'desc' },
    take: 60, // recent-most stale days -- plenty to fill MAX_RESULTS
  });

  const queue: { date: string; cellNumber: number; status: string }[] = [];
  for (const log of logs) {
    const cells = (log.cellData as unknown as CellDatum[]) || [];
    for (const cell of cells) {
      if (cell.status && RECYCLE_STATUSES.has(cell.status)) {
        queue.push({ date: log.date, cellNumber: cell.cellNumber, status: cell.status });
      }
    }
    if (queue.length >= MAX_RESULTS) break;
  }

  return NextResponse.json(queue.slice(0, MAX_RESULTS));
}
