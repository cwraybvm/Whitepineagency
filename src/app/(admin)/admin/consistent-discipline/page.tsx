'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Target, Phone, BookOpen, Dumbbell, Droplets, Minus, Plus, Loader2, Check, Flame } from 'lucide-react';
import { weekRange } from '@/lib/weekRange';
import { computeDailyStreak, computeWeeklyStreak, type DisciplineLogLite } from '@/lib/disciplineStreaks';
import { CALL_DAILY_TARGET } from '@/lib/bvmTargets';
import CopyWeeklyDigestButton from '@/components/admin/CopyWeeklyDigestButton';

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
const STREAK_WINDOW_DAYS = 180;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Hand-rolled circular progress ring -- a single hero indicator, not a data
// -viz surface, so no charting library.
function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={radius} fill="none" stroke="#1e293b" strokeWidth={12} />
      <circle
        cx={70}
        cy={70}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
      <text x={70} y={66} textAnchor="middle" fontSize={28} fontWeight={800} fill="#fff">
        {score}%
      </text>
      <text x={70} y={86} textAnchor="middle" fontSize={10} fill="#94a3b8">
        Daily Score
      </text>
    </svg>
  );
}

function StreakBadge({ emoji, count, unit, label }: { emoji: string; count: number; unit: string; label: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-white tabular-nums">
        {emoji} {count}-{unit} {label}
      </p>
    </div>
  );
}

export default function ConsistentDisciplinePage() {
  const [date, setDate] = useState(todayStr());
  const [log, setLog] = useState<DisciplineLog | null>(null);
  const [callsMade, setCallsMade] = useState(0);
  const [weekLogs, setWeekLogs] = useState<DisciplineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroCallsMade, setHeroCallsMade] = useState(0);
  const [historyLogs, setHistoryLogs] = useState<DisciplineLogLite[]>([]);

  // Hero stats (score + streaks) are always anchored to real "today",
  // independent of the `date` picker below (which lets you view/edit past
  // days) -- a live score that changed while browsing history would be
  // misleading. Fetched once on mount, not on `date` change.
  useEffect(() => {
    const realToday = todayStr();
    const windowStart = addDaysStr(realToday, -STREAK_WINDOW_DAYS);
    const windowEnd = addDaysStr(realToday, 1);

    setHeroLoading(true);
    Promise.all([
      fetch(`/api/consistent-discipline?start=${windowStart}&end=${windowEnd}`).then((r) => r.json()),
      fetch(`/api/bvm/call-log?date=${realToday}`).then((r) => r.json()),
    ])
      .then(([logs, callLog]) => {
        setHistoryLogs(logs);
        const cells = (callLog.cellData as { status: string | null }[]) || [];
        setHeroCallsMade(cells.filter((c) => c.status).length);
      })
      .catch(() => toast.error('Failed to load discipline stats'))
      .finally(() => setHeroLoading(false));
  }, []);

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

  const realToday = todayStr();
  const heroToday = historyLogs.find((l) => l.date === realToday);
  const heroWeek = weekRange(realToday);
  const heroWeekLogs = historyLogs.filter((l) => l.date >= heroWeek.start && l.date < heroWeek.end);
  const heroJiuJitsuWeekCount = heroWeekLogs.filter((l) => l.jiuJitsu).length;
  const heroWorkoutWeekCount = heroWeekLogs.filter((l) => l.workout).length;

  const dailyScore = Math.round(
    20 * Math.min(1, heroCallsMade / CALL_DAILY_TARGET) +
      20 * Math.min(1, (heroToday?.pagesRead ?? 0) / PAGES_TARGET) +
      20 * Math.min(1, (heroToday?.waterGlasses ?? 0) / WATER_TARGET) +
      20 * Math.min(1, heroJiuJitsuWeekCount / WEEKLY_TARGET) +
      20 * Math.min(1, heroWorkoutWeekCount / WEEKLY_TARGET)
  );

  const readingStreak = computeDailyStreak(historyLogs, realToday, (l) => l.pagesRead >= PAGES_TARGET);
  const waterStreak = computeDailyStreak(historyLogs, realToday, (l) => l.waterGlasses >= WATER_TARGET);
  const jiuJitsuStreak = computeWeeklyStreak(historyLogs, realToday, (l) => l.jiuJitsu, (count) => count >= WEEKLY_TARGET);
  const workoutStreak = computeWeeklyStreak(historyLogs, realToday, (l) => l.workout, (count) => count >= WEEKLY_TARGET);

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
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
          />
          <CopyWeeklyDigestButton />
        </div>
      </div>

      {heroLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-5">
          <ScoreRing score={dailyScore} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <StreakBadge emoji="🔥" count={readingStreak} unit="Day" label="Reading Streak" />
            <StreakBadge emoji="💧" count={waterStreak} unit="Day" label="Water Streak" />
            <StreakBadge emoji="🥋" count={jiuJitsuStreak} unit="Week" label="Jiu-Jitsu Streak" />
            <StreakBadge emoji="💪" count={workoutStreak} unit="Week" label="Workout Streak" />
          </div>
        </div>
      )}

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
