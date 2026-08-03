// src/components/sandbox/assetBadgeStyles.ts

export const TYPE_BADGE_STYLES: Record<string, string> = {
  AD: 'bg-[#1A3C34] text-white dark:bg-emerald-950 dark:text-emerald-200 dark:border dark:border-emerald-800/50',
  VIDEO_SCRIPT: 'bg-[#0F766E] text-white dark:bg-teal-950 dark:text-teal-200 dark:border dark:border-teal-800/50',
  COPY: 'bg-[#64748B] text-white dark:bg-slate-800 dark:text-slate-200',
  LANDING_PAGE: 'bg-[#0E7490] text-white dark:bg-cyan-950 dark:text-cyan-200 dark:border dark:border-cyan-800/50',
  DEFAULT: 'bg-[#475569] text-white dark:bg-slate-700 dark:text-slate-300',
};

export function typeBadgeClass(type: string): string {
  return TYPE_BADGE_STYLES[type] ?? TYPE_BADGE_STYLES.DEFAULT;
}

export type AssetStatus = 'STAGED' | 'PRODUCTION';

export const STATUS_BADGE_STYLES: Record<AssetStatus, { container: string; dot: string; label: string }> = {
  STAGED: {
    container: 'bg-[#0EA5E9] text-white dark:bg-sky-600',
    dot: 'bg-sky-200',
    label: 'READY',
  },
  PRODUCTION: {
    container: 'bg-[#059669] text-white dark:bg-emerald-600 dark:shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    dot: 'bg-emerald-300',
    label: 'ACTIVE',
  },
};

export function statusBadge(status: string) {
  return STATUS_BADGE_STYLES[status as AssetStatus] ?? { container: TYPE_BADGE_STYLES.DEFAULT, dot: 'bg-slate-400', label: status };
}
