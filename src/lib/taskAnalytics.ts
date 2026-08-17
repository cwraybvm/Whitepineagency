export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnalyticsTask {
  status: 'INBOX' | 'ACTIVE' | 'DONE';
  completedAt: string | null;
  estimatedMinutes: number | null;
  energyLevel: EnergyLevel | null;
  isParked: boolean;
}

export interface WeeklyStats {
  completedThisWeek: number;
  completedLastWeek: number;
  /** null when last week had zero completions -- no baseline to compare against. */
  trendPercent: number | null;
  /** 0-100. completedThisWeek / (completedThisWeek + still-open tasks). */
  completionRate: number;
  hoursCompletedThisWeek: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function completedInRange(tasks: AnalyticsTask[], start: Date, end: Date): AnalyticsTask[] {
  return tasks.filter((t) => {
    if (!t.completedAt) return false;
    const at = new Date(t.completedAt).getTime();
    return at >= start.getTime() && at < end.getTime();
  });
}

export function getWeeklyStats(tasks: AnalyticsTask[], now: Date = new Date()): WeeklyStats {
  const thisWeekStart = daysAgo(now, 7);
  const lastWeekStart = daysAgo(now, 14);

  const thisWeek = completedInRange(tasks, thisWeekStart, now);
  const lastWeek = completedInRange(tasks, lastWeekStart, thisWeekStart);

  const trendPercent =
    lastWeek.length === 0 ? null : Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100);

  const stillOpenCount = tasks.filter((t) => t.status !== 'DONE' && !t.isParked).length;
  const completionRate =
    thisWeek.length + stillOpenCount === 0 ? 0 : Math.round((thisWeek.length / (thisWeek.length + stillOpenCount)) * 100);

  const hoursCompletedThisWeek = thisWeek.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0) / 60;

  return {
    completedThisWeek: thisWeek.length,
    completedLastWeek: lastWeek.length,
    trendPercent,
    completionRate,
    hoursCompletedThisWeek,
  };
}

export interface EnergyBreakdownSlice {
  level: EnergyLevel | 'UNTAGGED';
  count: number;
  percent: number;
}

export function getEnergyBreakdown(tasks: AnalyticsTask[], now: Date = new Date()): EnergyBreakdownSlice[] {
  const thisWeek = completedInRange(tasks, daysAgo(now, 7), now);
  const counts: Record<EnergyLevel | 'UNTAGGED', number> = { LOW: 0, MEDIUM: 0, HIGH: 0, UNTAGGED: 0 };
  for (const t of thisWeek) counts[t.energyLevel ?? 'UNTAGGED']++;

  const total = thisWeek.length;
  return (Object.keys(counts) as (EnergyLevel | 'UNTAGGED')[]).map((level) => ({
    level,
    count: counts[level],
    percent: total === 0 ? 0 : Math.round((counts[level] / total) * 100),
  }));
}

/** Percent (0-100) of the trailing 7 calendar days with at least one completion. */
export function getStreakConsistency(tasks: AnalyticsTask[], now: Date = new Date()): number {
  const completedDays = new Set<string>();
  for (const t of tasks) {
    if (!t.completedAt) continue;
    const at = new Date(t.completedAt);
    if (at.getTime() >= daysAgo(now, 7).getTime() && at.getTime() <= now.getTime()) {
      completedDays.add(at.toISOString().slice(0, 10));
    }
  }
  return Math.round((completedDays.size / 7) * 100);
}
