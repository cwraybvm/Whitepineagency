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

export function formatScheduledBadge(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}
