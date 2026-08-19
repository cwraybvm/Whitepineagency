// Shared call-status vocabulary for the BVM Business call-consistency grid,
// reports, and reused wherever a cell status needs a label + color.
export const BVM_STATUS_OPTIONS = [
  { value: 'I', label: 'I', color: '#06B6D4' }, // Cyan
  { value: 'LMGK', label: 'LMGK', color: '#F97316' }, // Orange
  { value: 'LVM', label: 'LVM', color: '#A855F7' }, // Purple
  { value: 'NA', label: 'NA', color: '#8B5CF6' }, // Violet
  { value: 'No', label: 'No', color: '#EF4444' }, // Red
  { value: 'Yes', label: 'Yes', color: '#22C55E' }, // Green
] as const;

export type BvmStatusValue = (typeof BVM_STATUS_OPTIONS)[number]['value'];

export const BVM_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  BVM_STATUS_OPTIONS.map((o) => [o.value, o.color])
);
