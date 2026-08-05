'use client';

import { LayoutGrid, List } from 'lucide-react';

export type StatusFilter = 'ALL' | 'STAGED' | 'PRODUCTION';
export type TypeFilter = 'ALL' | 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'LANDING_PAGE';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'STAGED', label: 'Ready' },
  { value: 'PRODUCTION', label: 'Active' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'COPY', label: 'Copy' },
  { value: 'AD', label: 'Ad' },
  { value: 'VIDEO_SCRIPT', label: 'Video' },
  { value: 'LANDING_PAGE', label: 'Landing' },
];

function pillGroup<T extends string>(
  options: { value: T; label: string }[],
  active: T,
  onChange: (v: T) => void,
) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
            active === opt.value
              ? 'bg-[#059669] text-white border-[#059669] dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-white/85 text-slate-500 border-white/60 dark:bg-slate-900/70 dark:text-slate-400 dark:border-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AssetsSidebar({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange,
}: {
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}) {
  return (
    <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Status</span>
          {pillGroup(STATUS_OPTIONS, statusFilter, onStatusFilterChange)}
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Type</span>
          {pillGroup(TYPE_OPTIONS, typeFilter, onTypeFilterChange)}
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-1 shrink-0">
        <button
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
          className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
          className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
