export type BingoPeriod = 'DAILY' | 'WEEKLY';

export type BingoMetric =
  | 'TASK_BEFORE_10AM'
  | 'UNSTICK_COUNT'
  | 'FOCUS_SESSION_COUNT'
  | 'FOCUS_MINUTES'
  | 'TASKS_COMPLETED'
  | 'TASKS_CREATED'
  | 'TASKS_PARKED'
  | 'ENERGY_TAGGED'
  | 'HIGH_ENERGY_DONE'
  | 'FOCUS_TODAY_STARRED';

export interface GoalTemplate {
  id: string;
  label: string;
  metric: BingoMetric;
  target: number;
}

// ponytail: pools sized exactly 9 so every board uses every template --
// bump past 9 (and let pickTiles slice) if boards should vary day-to-day.
export const DAILY_GOALS: GoalTemplate[] = [
  { id: 'd-before-10am', label: 'Complete 1 task before 10 AM', metric: 'TASK_BEFORE_10AM', target: 1 },
  { id: 'd-unstick', label: 'Unstick 1 task', metric: 'UNSTICK_COUNT', target: 1 },
  { id: 'd-focus-session', label: 'Run 1 Focus session', metric: 'FOCUS_SESSION_COUNT', target: 1 },
  { id: 'd-focus-minutes', label: 'Log 15 min of Focus time', metric: 'FOCUS_MINUTES', target: 15 },
  { id: 'd-completed-3', label: 'Complete 3 tasks', metric: 'TASKS_COMPLETED', target: 3 },
  { id: 'd-created-1', label: 'Add 1 new task', metric: 'TASKS_CREATED', target: 1 },
  { id: 'd-parked-1', label: 'Park 1 stale task', metric: 'TASKS_PARKED', target: 1 },
  { id: 'd-energy-2', label: 'Tag 2 tasks with an energy level', metric: 'ENERGY_TAGGED', target: 2 },
  { id: 'd-star-1', label: 'Star 1 task for Focus Today', metric: 'FOCUS_TODAY_STARRED', target: 1 },
];

export const WEEKLY_GOALS: GoalTemplate[] = [
  { id: 'w-completed-10', label: 'Complete 10 total tasks', metric: 'TASKS_COMPLETED', target: 10 },
  { id: 'w-focus-hours-3', label: 'Log 3 hours of Focus time', metric: 'FOCUS_MINUTES', target: 180 },
  { id: 'w-parked-5', label: 'Park 5 stale tasks', metric: 'TASKS_PARKED', target: 5 },
  { id: 'w-unstick-5', label: 'Unstick 5 tasks', metric: 'UNSTICK_COUNT', target: 5 },
  { id: 'w-focus-sessions-5', label: 'Run 5 Focus sessions', metric: 'FOCUS_SESSION_COUNT', target: 5 },
  { id: 'w-created-10', label: 'Add 10 new tasks', metric: 'TASKS_CREATED', target: 10 },
  { id: 'w-high-energy-3', label: 'Complete 3 High-Energy tasks', metric: 'HIGH_ENERGY_DONE', target: 3 },
  { id: 'w-star-5', label: 'Star 5 tasks for Focus Today', metric: 'FOCUS_TODAY_STARRED', target: 5 },
  { id: 'w-energy-10', label: 'Tag 10 tasks with an energy level', metric: 'ENERGY_TAGGED', target: 10 },
];

export const GOAL_POOLS: Record<BingoPeriod, GoalTemplate[]> = {
  DAILY: DAILY_GOALS,
  WEEKLY: WEEKLY_GOALS,
};

// deterministic string hash -> PRNG seed (djb2)
function hashSeed(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h * 33) ^ key.charCodeAt(i);
  }
  return h >>> 0;
}

// mulberry32 -- small, deterministic, good enough for shuffling 9 items
function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same seedKey always yields the same tile order -- the "deterministic by date" part. */
export function pickTiles(seedKey: string, pool: GoalTemplate[], count = 9): GoalTemplate[] {
  const rng = mulberry32(hashSeed(seedKey));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export interface BingoCellStatus {
  index: number;
  id: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Server computes boundaries in UTC (no per-user tz stored). */
export function getDailySeedKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// ISO 8601 week number
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function getWeeklySeedKey(date = new Date()): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${pad2(week)}`;
}

export function getSeedKey(period: BingoPeriod, date = new Date()): string {
  return period === 'DAILY' ? getDailySeedKey(date) : getWeeklySeedKey(date);
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

/** [start, end) window a board's stats are computed over, in UTC. */
export function getPeriodRange(period: BingoPeriod, date = new Date()): PeriodRange {
  if (period === 'DAILY') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - dayNum + 1); // back up to Monday
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Within-day cutoff for the "before 10 AM" goal -- reuses the DAILY period's own start. */
export function getBefore10amCutoff(dailyStart: Date): Date {
  return new Date(dailyStart.getTime() + 10 * 60 * 60 * 1000);
}

export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Returns the lines (as index triples) that are fully completed. */
export function getCompletedLines(completed: boolean[]): number[][] {
  return LINES.filter((line) => line.every((i) => completed[i]));
}

export function isFullBoardComplete(completed: boolean[]): boolean {
  return completed.length === 9 && completed.every(Boolean);
}
