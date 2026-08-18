'use client';

import { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';

interface TaskScheduleModalProps {
  task: {
    id: string;
    title: string;
    scheduledAt: string | null;
    syncToGoogleCalendar: boolean;
  };
  onClose: () => void;
  onSaved: (updated: { scheduledAt: string | null; syncToGoogleCalendar: boolean; googleCalendarEventId: string | null }) => void;
}

// Formats an ISO datetime into the value a <input type="datetime-local"> expects.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TaskScheduleModal({ task, onClose, onSaved }: TaskScheduleModalProps) {
  const [value, setValue] = useState(toLocalInputValue(task.scheduledAt));
  const [syncEnabled, setSyncEnabled] = useState(task.syncToGoogleCalendar);
  const [saving, setSaving] = useState(false);

  async function save(nextValue: string, nextSync: boolean) {
    setSaving(true);
    try {
      const res = await fetch('/api/tasks/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          scheduledAt: nextValue ? new Date(nextValue).toISOString() : null,
          syncToGoogleCalendar: nextSync,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Calendar className="w-4 h-4 text-emerald-400" /> Schedule Task
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-gray-300 line-clamp-2">{task.title}</div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-gray-500">Date &amp; Time</label>
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
        </div>

        <label className="flex items-center justify-between gap-2 text-sm text-gray-300 cursor-pointer">
          <span>Sync with Google Calendar</span>
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
        </label>

        <div className="flex gap-2">
          {task.scheduledAt && (
            <button
              onClick={() => save('', syncEnabled)}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => save(value, syncEnabled)}
            disabled={saving || !value}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl px-4 py-2.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
