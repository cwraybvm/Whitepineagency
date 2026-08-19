import { weekRange } from './weekRange';

export interface DisciplineLogLite {
  date: string;
  pagesRead: number;
  jiuJitsu: boolean;
  workout: boolean;
  waterGlasses: number;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// ponytail: bounded by however much history the caller fetched (this app
// fetches a 180-day window) -- a genuine streak longer than that undercounts.
// Widen the fetch window if that ever becomes real.
export function computeDailyStreak(
  logs: DisciplineLogLite[],
  todayStr: string,
  meetsTarget: (log: DisciplineLogLite) => boolean
): number {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  let streak = 0;
  let cursor = todayStr;
  while (true) {
    const log = byDate.get(cursor);
    if (log && meetsTarget(log)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

// Walks backward week-by-week starting from the most recently COMPLETED
// week -- the current in-progress week is excluded (its live progress is
// already shown by the "n/2 this week" chips; an unfinished week is neither
// a hit nor a miss yet).
export function computeWeeklyStreak(
  logs: DisciplineLogLite[],
  todayStr: string,
  countInWeek: (log: DisciplineLogLite) => boolean,
  meetsWeek: (count: number) => boolean
): number {
  let cursorStart = addDays(weekRange(todayStr).start, -7);
  let streak = 0;
  while (true) {
    const cursorEnd = addDays(cursorStart, 7);
    const count = logs.filter((l) => l.date >= cursorStart && l.date < cursorEnd && countInWeek(l)).length;
    if (meetsWeek(count)) {
      streak++;
      cursorStart = addDays(cursorStart, -7);
    } else {
      break;
    }
  }
  return streak;
}
