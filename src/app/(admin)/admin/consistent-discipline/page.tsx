'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Target, Phone, BookOpen, Dumbbell, Droplets, Minus, Plus, Loader2, Check } from 'lucide-react';
import { weekRange } from '@/lib/weekRange';

interface DisciplineLog {
  id: string | null;
  date: string;
  pagesRead: number;
  jiuJitsu: boolean;
  workout: boolean;
  waterGlasses: number;
  notes: string | null;
}

const PAGES_TARGET = 10;
const WATER_TARGET = 7;
const WEEKLY_TARGET = 2;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsistentDisciplinePage() {
  const [date, setDate] = useState(todayStr());
  const [log, setLog] = useState<DisciplineLog | null>(null);
  const [callsMade, setCallsMade] = useState(0);
  const [weekLogs, setWeekLogs] = useState<DisciplineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const { start, end } = weekRange(date);

    Promise.all([
      fetch(`/api/consistent-discipline?date=${date}`).then((r) => r.json()),
      fetch(`/api/bvm/call-log?date=${date}`).then((r) => r.json()),
      fetch(`/api/consistent-discipline?start=${start}&end=${end}`).then((r) => r.json()),
    ])
      .then(([dayLog, callLog, week]) => {
        setLog(dayLog);
        const cells = (callLog.cellData as { status: string | null }[]) || [];
        setCallsMade(cells.filter((c) => c.status).length);
        setWeekLogs(week);
      })
      .catch(() => toast.error('Failed to load discipline tracker'))
      .finally(() => setLoading(false));
  }, [date]);

  async function saveField(patch: Partial<Pick<DisciplineLog, 'pagesRead' | 'jiuJitsu' | 'workout' | 'waterGlasses'>>) {
    if (!log) return;
    const next = { ...log, ...patch };
    setLog(next);
    setWeekLogs((prev) => {
      const exists = prev.some((l) => l.date === date);
      if (exists) return prev.map((l) => (l.date === date ? { ...l, ...patch } : l));
      return [...prev, next];
    });

    setSaving(true);
    try {
      const res = await fetch('/api/consistent-discipline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...patch }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to save — try again');
    } finally {
      setSaving(false);
    }
  }

  const pagesPct = log ? Math.min(100, Math.round((log.pagesRead / PAGES_TARGET) * 100)) : 0;
  const waterPct = log ? Math.min(100, Math.round((log.waterGlasses / WATER_TARGET) * 100)) : 0;
  const jiuJitsuWeekCount = weekLogs.filter((l) => l.jiuJitsu).length;
  const workoutWeekCount = weekLogs.filter((l) => l.workout).length;

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Consistent Discipline</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Daily habit tracker {saving && <span className="text-emerald-400">(saving…)</span>}
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
        />
      </div>

      {loading || !log ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Calls Made</h3>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{callsMade}</p>
            <p className="text-[10px] text-slate-500">Auto-imported from Call Consistency</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Pages Read</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => saveField({ pagesRead: Math.max(0, log.pagesRead - 1) })}
                  className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={log.pagesRead}
                  onChange={(e) => saveField({ pagesRead: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-12 text-center bg-slate-950 border border-slate-800 rounded-lg py-1 text-xs text-white font-mono"
                />
                <button
                  onClick={() => saveField({ pagesRead: log.pagesRead + 1 })}
                  className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 tabular-nums">{log.pagesRead} / {PAGES_TARGET} pages — {pagesPct}%</p>
            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pagesPct}%` }} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Jiu-Jitsu Attended</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{jiuJitsuWeekCount} / {WEEKLY_TARGET} this week</span>
            </div>
            <button
              onClick={() => saveField({ jiuJitsu: !log.jiuJitsu })}
              className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl font-bold text-sm ${
                log.jiuJitsu ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {log.jiuJitsu && <Check className="w-4 h-4" />} {log.jiuJitsu ? 'Attended Today' : 'Mark as Attended'}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">Workout Completed</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{workoutWeekCount} / {WEEKLY_TARGET} this week</span>
            </div>
            <button
              onClick={() => saveField({ workout: !log.workout })}
              className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl font-bold text-sm ${
                log.workout ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {log.workout && <Check className="w-4 h-4" />} {log.workout ? 'Completed Today' : 'Mark as Completed'}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Water Intake</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => saveField({ waterGlasses: Math.max(0, log.waterGlasses - 1) })}
                  disabled={log.waterGlasses <= 0}
                  className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white tabular-nums w-8 text-center">{log.waterGlasses}</span>
                <button
                  onClick={() => saveField({ waterGlasses: log.waterGlasses + 1 })}
                  className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 tabular-nums">{log.waterGlasses} / {WATER_TARGET} glasses (8oz each) — {waterPct}%</p>
            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${waterPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
