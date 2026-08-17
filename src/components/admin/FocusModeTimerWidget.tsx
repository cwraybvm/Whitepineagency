'use client';

import { Clock } from 'lucide-react';
import type { ActiveEntry } from '@/hooks/useBillingTimer';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

interface FocusModeTimerWidgetProps {
  organizationId: string | null;
  active: ActiveEntry | null;
  elapsed: number;
  autoStart: boolean;
  onToggleAutoStart: () => void;
}

export default function FocusModeTimerWidget({
  organizationId,
  active,
  elapsed,
  autoStart,
  onToggleAutoStart,
}: FocusModeTimerWidgetProps) {
  const tracking = !!active && active.organizationId === organizationId;

  let status: string;
  if (!organizationId) {
    status = "No client assigned — time won't be tracked.";
  } else if (!autoStart) {
    status = 'Auto-start disabled.';
  } else if (tracking) {
    status = 'Tracking billable time';
  } else {
    status = 'Not tracking.';
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2 text-gray-400">
        <Clock className={`w-3.5 h-3.5 ${tracking ? 'text-emerald-400' : ''}`} />
        <span>{status}</span>
        {tracking && <span className="text-white font-mono tabular-nums">{formatElapsed(elapsed)}</span>}
      </div>
      <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoStart}
          onChange={onToggleAutoStart}
          className="w-3.5 h-3.5 accent-emerald-500"
        />
        Auto-start Billing Timer
      </label>
    </div>
  );
}
