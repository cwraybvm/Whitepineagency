const STORAGE_KEY = 'taskStreak';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null; // 'YYYY-MM-DD', local date
}

const EMPTY_STATE: StreakState = { currentStreak: 0, longestStreak: 0, lastCompletionDate: null };

function todayLocal(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function isYesterday(dateStr: string, today: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10) === today;
}

export function getTaskStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (typeof parsed.currentStreak !== 'number') return EMPTY_STATE;
    return parsed;
  } catch {
    return EMPTY_STATE;
  }
}

export function recordTaskCompletion(): StreakState {
  const today = todayLocal();
  const prev = getTaskStreak();

  let currentStreak: number;
  if (prev.lastCompletionDate === today) {
    currentStreak = prev.currentStreak;
  } else if (prev.lastCompletionDate && isYesterday(prev.lastCompletionDate, today)) {
    currentStreak = prev.currentStreak + 1;
  } else {
    currentStreak = 1;
  }

  const next: StreakState = {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastCompletionDate: today,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage disabled/full — state still returned for this session's in-memory use
  }

  return next;
}
