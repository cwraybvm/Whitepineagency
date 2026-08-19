export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const ENERGY_LEVELS: EnergyLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export const ENERGY_META: Record<EnergyLevel, { emoji: string; short: string; title: string; badge: string; pill: string }> = {
  LOW: {
    emoji: '⚡',
    short: 'Low',
    title: 'Low Energy / Quick Win',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pill: 'bg-amber-500 text-black',
  },
  MEDIUM: {
    emoji: '🧠',
    short: 'Med',
    title: 'Medium Focus',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    pill: 'bg-indigo-500 text-white',
  },
  HIGH: {
    emoji: '🔥',
    short: 'High',
    title: 'Deep Focus / High Energy',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    pill: 'bg-red-500 text-white',
  },
};

export function nextEnergyLevel(current: EnergyLevel | null): EnergyLevel | null {
  if (current === null) return 'LOW';
  if (current === 'LOW') return 'MEDIUM';
  if (current === 'MEDIUM') return 'HIGH';
  return null;
}

export const DURATION_OPTIONS = [5, 15, 30, 60, 120];

export function formatDuration(minutes: number): string {
  return minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
}

export function nextDuration(current: number | null): number | null {
  if (current === null) return DURATION_OPTIONS[0];
  const idx = DURATION_OPTIONS.indexOf(current);
  if (idx === -1 || idx === DURATION_OPTIONS.length - 1) return null;
  return DURATION_OPTIONS[idx + 1];
}

// Priority reuses the existing Task.priority Int column (@default(0)) --
// no schema change needed. Ordinal mapping: 0=LOW, 1=MEDIUM, 2=HIGH, so
// existing rows (priority 0) read as LOW and `orderBy priority desc` still
// puts HIGH first.
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const PRIORITY_LEVELS: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export const PRIORITY_META: Record<PriorityLevel, { emoji: string; short: string; title: string; badge: string; pill: string; value: number }> = {
  LOW: {
    emoji: '🟢',
    short: 'Low',
    title: 'Low Priority',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pill: 'bg-emerald-500 text-black',
    value: 0,
  },
  MEDIUM: {
    emoji: '🟡',
    short: 'Med',
    title: 'Medium Priority',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pill: 'bg-amber-500 text-black',
    value: 1,
  },
  HIGH: {
    emoji: '🔴',
    short: 'High',
    title: 'High Priority',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    pill: 'bg-red-500 text-white',
    value: 2,
  },
};

export function priorityFromValue(value: number): PriorityLevel {
  if (value >= 2) return 'HIGH';
  if (value === 1) return 'MEDIUM';
  return 'LOW';
}

export function nextPriorityValue(current: number): number {
  const level = priorityFromValue(current);
  if (level === 'LOW') return PRIORITY_META.MEDIUM.value;
  if (level === 'MEDIUM') return PRIORITY_META.HIGH.value;
  return PRIORITY_META.LOW.value;
}

export function formatScheduledBadge(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}
