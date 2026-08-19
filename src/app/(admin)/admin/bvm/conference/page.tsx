'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Users, Loader2, Check, X } from 'lucide-react';

interface ConferenceCall {
  id: string | null;
  date: string;
  attended: boolean;
  notes: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConferenceCallsPage() {
  const [date, setDate] = useState(todayStr());
  const [call, setCall] = useState<ConferenceCall>({ id: null, date, attended: false, notes: '' });
  const [history, setHistory] = useState<ConferenceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    loadedForDate.current = null;
    fetch(`/api/bvm/conference?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setCall(data);
        loadedForDate.current = date;
      })
      .catch(() => toast.error('Failed to load conference call'))
      .finally(() => setLoading(false));

    fetch('/api/bvm/conference')
      .then((res) => res.json())
      .then(setHistory)
      .catch(() => {});
  }, [date]);

  function scheduleSave(next: ConferenceCall) {
    if (loadedForDate.current !== date) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/bvm/conference', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, attended: next.attended, notes: next.notes }),
        });
        if (!res.ok) throw new Error();
        setHistory((h) => {
          const filtered = h.filter((c) => c.date !== date);
          return [{ ...next, date }, ...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
        });
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function setAttended(attended: boolean) {
    const next = { ...call, attended };
    setCall(next);
    scheduleSave(next);
  }

  function setNotes(notes: string) {
    const next = { ...call, notes };
    setCall(next);
    scheduleSave(next);
  }

  const attendanceRate = history.length ? Math.round((history.filter((c) => c.attended).length / history.length) * 100) : 0;

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Conference Calls</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Daily attendance + notes {saving && <span className="text-emerald-400">(saving…)</span>}
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Attendance</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAttended(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                  call.attended ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Yes
              </button>
              <button
                onClick={() => setAttended(false)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                  !call.attended ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <X className="w-3.5 h-3.5" /> No
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Notes</label>
            <textarea
              value={call.notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder="Daily call notes…"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-sans resize-y focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Attendance History</h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">{attendanceRate}% attendance rate</span>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">No entries yet</p>
          ) : (
            history.map((c) => (
              <div key={c.date} className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400">{c.date}</span>
                <span className={c.attended ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{c.attended ? 'Yes' : 'No'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
