import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { weekRange } from '@/lib/weekRange';
import { CALL_DAILY_TARGET, IRS_MILEAGE_RATE, PAGES_DAILY_TARGET, WATER_DAILY_TARGET, WEEKLY_TRAINING_TARGET } from '@/lib/bvmTargets';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

function addDaysStr(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// 📊 GET: aggregate the Sunday-start week containing ?date= (default today)
// across call activity, discipline habits, appointments, drop-offs, and
// mileage -- feeds both the digest text and any future dashboard use.
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const anchor = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const { start, end } = weekRange(anchor);
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  const [callLogs, disciplineLogs, appointmentsSet, dropOffsCompleted, mileageExpenses] = await Promise.all([
    prisma.bvmCallLog.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.consistentDisciplineLog.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.bvmAppointment.count({ where: { date: { gte: startDate, lt: endDate } } }),
    prisma.bvmClientKanban.count({ where: { stage: 'Magazine Dropped', lastContacted: { gte: startDate, lt: endDate } } }),
    prisma.expense.findMany({ where: { type: 'MILEAGE', organizationId: null, date: { gte: startDate, lt: endDate } } }),
  ]);

  const callsByDate = new Map(
    callLogs.map((log) => {
      const cells = (log.cellData as unknown as CellDatum[]) || [];
      return [log.date, cells.filter((c) => c.status).length] as const;
    })
  );
  const disciplineByDate = new Map(disciplineLogs.map((l) => [l.date, l]));

  let totalCalls = 0;
  let totalLvmGk = 0;
  let totalInfoGathered = 0;
  let leadsAdded = 0;
  for (const log of callLogs) {
    const cells = (log.cellData as unknown as CellDatum[]) || [];
    for (const cell of cells) {
      if (!cell.status) continue;
      totalCalls++;
      if (cell.status === 'LMGK' || cell.status === 'LVM') totalLvmGk++;
      if (cell.status === 'I') totalInfoGathered++;
    }
    leadsAdded += log.leadsAdded;
  }

  const totalPagesRead = disciplineLogs.reduce((sum, l) => sum + l.pagesRead, 0);
  const totalWaterGlasses = disciplineLogs.reduce((sum, l) => sum + l.waterGlasses, 0);
  const jiuJitsuCompleted = disciplineLogs.filter((l) => l.jiuJitsu).length;
  const workoutsCompleted = disciplineLogs.filter((l) => l.workout).length;

  const totalMiles = mileageExpenses.reduce((sum, e) => sum + (e.miles || 0), 0);
  const totalDeduction = mileageExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Average daily discipline score across the 7 calendar days of the week --
  // jiu-jitsu/workout terms are week-scoped so they're identical each day;
  // calls/pages/water vary per day. Computed as 7 literal daily scores,
  // averaged, matching the existing Consistent Discipline hero-ring formula.
  let scoreSum = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDaysStr(start, i);
    const calls = callsByDate.get(day) || 0;
    const disc = disciplineByDate.get(day);
    scoreSum +=
      20 * Math.min(1, calls / CALL_DAILY_TARGET) +
      20 * Math.min(1, (disc?.pagesRead ?? 0) / PAGES_DAILY_TARGET) +
      20 * Math.min(1, (disc?.waterGlasses ?? 0) / WATER_DAILY_TARGET) +
      20 * Math.min(1, jiuJitsuCompleted / WEEKLY_TRAINING_TARGET) +
      20 * Math.min(1, workoutsCompleted / WEEKLY_TRAINING_TARGET);
  }
  const complianceScore = Math.round(scoreSum / 7);

  return NextResponse.json({
    weekStart: start,
    weekEnd: addDaysStr(end, -1),
    complianceScore,
    habits: {
      totalPagesRead,
      avgPagesPerDay: totalPagesRead / 7,
      totalWaterGlasses,
      avgWaterPerDay: totalWaterGlasses / 7,
      jiuJitsuCompleted,
      jiuJitsuTarget: WEEKLY_TRAINING_TARGET,
      workoutsCompleted,
      workoutsTarget: WEEKLY_TRAINING_TARGET,
    },
    sales: {
      totalCalls,
      totalLvmGk,
      totalInfoGathered,
      appointmentsSet,
      leadsAdded,
      dropOffsCompleted,
    },
    mileage: {
      totalMiles,
      totalDeduction,
    },
  });
}
