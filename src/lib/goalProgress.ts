import { prisma } from './prisma';
import { weekRange } from './weekRange';
import { computeDailyStreak, type DisciplineLogLite } from './disciplineStreaks';
import { CALL_DAILY_TARGET, PAGES_DAILY_TARGET, WATER_DAILY_TARGET, WEEKLY_TRAINING_TARGET } from './bvmTargets';

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysStr(s: string, delta: number): string {
  const d = new Date(`${s}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function callsFilled(cellData: unknown): number {
  const cells = (cellData as CellDatum[]) || [];
  return cells.filter((c) => c.status).length;
}

// Computes a RewardGoal's live currentValue from the underlying source
// tables. All types except COMPOSITE_STREAK are a sum/average over
// [startDate, endDate); COMPOSITE_STREAK is "consecutive days as of now,"
// which doesn't fit that model, so it's handled separately below.
export async function computeGoalCurrentValue(targetType: string, startDate: Date, endDate: Date): Promise<number> {
  const startStr = dateStr(startDate);
  const endStr = dateStr(endDate);

  switch (targetType) {
    case 'CALLS_COUNT': {
      const logs = await prisma.bvmCallLog.findMany({ where: { date: { gte: startStr, lt: endStr } } });
      return logs.reduce((sum, log) => sum + callsFilled(log.cellData), 0);
    }

    case 'LEADS_ADDED': {
      const logs = await prisma.bvmCallLog.findMany({ where: { date: { gte: startStr, lt: endStr } } });
      return logs.reduce((sum, l) => sum + l.leadsAdded, 0);
    }

    case 'DROP_OFFS_COMPLETED': {
      return prisma.bvmClientKanban.count({
        where: { stage: 'Magazine Dropped', lastContacted: { gte: startDate, lt: endDate } },
      });
    }

    case 'MILES_LOGGED': {
      const expenses = await prisma.expense.findMany({
        where: { type: 'MILEAGE', organizationId: null, date: { gte: startDate, lt: endDate } },
      });
      return expenses.reduce((sum, e) => sum + (e.miles || 0), 0);
    }

    case 'DISCIPLINE_SCORE_AVG': {
      // Padded 6 days before startDate so a day near the range's start can
      // still see the full week its Jiu-Jitsu/Workout pace credit needs.
      const paddedStart = addDaysStr(startStr, -6);
      const [callLogs, disciplineLogs] = await Promise.all([
        prisma.bvmCallLog.findMany({ where: { date: { gte: paddedStart, lt: endStr } } }),
        prisma.consistentDisciplineLog.findMany({ where: { date: { gte: paddedStart, lt: endStr } } }),
      ]);
      const callsByDate = new Map(callLogs.map((log) => [log.date, callsFilled(log.cellData)]));
      const disciplineByDate = new Map(disciplineLogs.map((l) => [l.date, l]));

      let cursor = startStr;
      let scoreSum = 0;
      let dayCount = 0;
      while (cursor < endStr) {
        const week = weekRange(cursor);
        const weekLogs = disciplineLogs.filter((l) => l.date >= week.start && l.date < week.end);
        const jjCount = weekLogs.filter((l) => l.jiuJitsu).length;
        const woCount = weekLogs.filter((l) => l.workout).length;
        const calls = callsByDate.get(cursor) || 0;
        const disc = disciplineByDate.get(cursor);
        scoreSum +=
          20 * Math.min(1, calls / CALL_DAILY_TARGET) +
          20 * Math.min(1, (disc?.pagesRead ?? 0) / PAGES_DAILY_TARGET) +
          20 * Math.min(1, (disc?.waterGlasses ?? 0) / WATER_DAILY_TARGET) +
          20 * Math.min(1, jjCount / WEEKLY_TRAINING_TARGET) +
          20 * Math.min(1, woCount / WEEKLY_TRAINING_TARGET);
        dayCount++;
        cursor = addDaysStr(cursor, 1);
      }
      return dayCount > 0 ? Math.round(scoreSum / dayCount) : 0;
    }

    case 'COMPOSITE_STREAK': {
      // Anchored at min(endDate, today) -- a streak "as of a future date"
      // isn't meaningful. "Composite" = all 4 daily habits hit at once,
      // the same concept BVM Reports' habit-compliance heat strip uses.
      const today = dateStr(new Date());
      const anchor = endStr < today ? endStr : today;
      const windowStart = addDaysStr(anchor, -180);
      const logs: DisciplineLogLite[] = await prisma.consistentDisciplineLog.findMany({
        where: { date: { gte: windowStart, lte: anchor } },
      });
      return computeDailyStreak(
        logs,
        anchor,
        (l) => l.pagesRead >= PAGES_DAILY_TARGET && l.waterGlasses >= WATER_DAILY_TARGET && l.jiuJitsu && l.workout
      );
    }

    default:
      return 0;
  }
}
