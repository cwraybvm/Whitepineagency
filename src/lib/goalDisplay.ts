export const TARGET_TYPE_OPTIONS: { value: string; label: string; unit: string }[] = [
  { value: 'CALLS_COUNT', label: 'Calls Made', unit: 'Calls' },
  { value: 'DISCIPLINE_SCORE_AVG', label: 'Avg Discipline Score (%)', unit: '%' },
  { value: 'LEADS_ADDED', label: 'Leads Added', unit: 'Leads' },
  { value: 'DROP_OFFS_COMPLETED', label: 'Drop-Offs Completed', unit: 'Accounts' },
  { value: 'MILES_LOGGED', label: 'Miles Logged', unit: 'Miles' },
  { value: 'COMPOSITE_STREAK', label: 'Composite Day Streak', unit: 'Days' },
];

export const EMOJI_PRESETS = ['🥋', '✈️', '⌚', '🎁', '🏆', '💰', '🎯', '🔥', '🚗', '📚'];

export function targetTypeLabel(targetType: string): string {
  return TARGET_TYPE_OPTIONS.find((o) => o.value === targetType)?.label || targetType;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// "342 / 500 Calls (68.4%)" for count-style goals, "88% / 90% Avg Discipline
// Score" for the percentage-style one -- a percentage goal doesn't get a
// second "%" stacked on top of a ratio percentage.
export function formatGoalReadout(targetType: string, currentValue: number, targetValue: number): string {
  const pct = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
  if (targetType === 'DISCIPLINE_SCORE_AVG') {
    return `${fmt(currentValue)}% / ${fmt(targetValue)}% Avg Discipline Score`;
  }
  const unit = targetTypeLabel(targetType);
  return `${fmt(currentValue)} / ${fmt(targetValue)} ${unit} (${pct.toFixed(1)}%)`;
}

export function formatGoalRemaining(targetType: string, currentValue: number, targetValue: number): string {
  const remaining = Math.max(0, targetValue - currentValue);
  const opt = TARGET_TYPE_OPTIONS.find((o) => o.value === targetType);
  const unit = opt?.unit || '';
  if (targetType === 'DISCIPLINE_SCORE_AVG') return `${fmt(remaining)}% more avg score needed`;
  if (targetType === 'COMPOSITE_STREAK') return `${fmt(remaining)} more day${remaining === 1 ? '' : 's'} needed`;
  return `${fmt(remaining)} ${unit.toLowerCase()} remaining`;
}
