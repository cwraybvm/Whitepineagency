'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Phone, Minus, Plus, Loader2 } from 'lucide-react';
import { BVM_STATUS_OPTIONS, BVM_STATUS_COLOR } from '@/lib/bvmStatus';

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

const MIN_CELLS = 45;
const MAX_CELLS = 70;
const STEP = 5;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildGrid(count: number): CellDatum[] {
  return Array.from({ length: count }, (_, i) => ({ cellNumber: i + 1, status: null }));
}

export default function CallConsistencyPage() {
  const [date, setDate] = useState(todayStr());
  const [cellCount, setCellCount] = useState(MIN_CELLS);
  const [cellData, setCellData] = useState<CellDatum[]>(buildGrid(MIN_CELLS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    loadedForDate.current = null;
    fetch(`/api/bvm/call-log?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setCellCount(data.cellCount || MIN_CELLS);
        setCellData(data.cellData || buildGrid(MIN_CELLS));
        loadedForDate.current = date;
      })
      .catch(() => toast.error('Failed to load call log'))
      .finally(() => setLoading(false));
  }, [date]);

  function scheduleSave(nextCellCount: number, nextCellData: CellDatum[]) {
    if (loadedForDate.current !== date) return; // don't save over data we haven't finished loading
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/bvm/call-log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, cellCount: nextCellCount, cellData: nextCellData }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function setCellStatus(cellNumber: number, status: string | null) {
    const next = cellData.map((c) => (c.cellNumber === cellNumber ? { ...c, status } : c));
    setCellData(next);
    scheduleSave(cellCount, next);
  }

  function resizeGrid(delta: number) {
    const next = Math.min(MAX_CELLS, Math.max(MIN_CELLS, cellCount + delta));
    if (next === cellCount) return;
    let nextData: CellDatum[];
    if (next > cellCount) {
      nextData = [...cellData, ...Array.from({ length: next - cellCount }, (_, i) => ({ cellNumber: cellCount + i + 1, status: null }))];
    } else {
      nextData = cellData.filter((c) => c.cellNumber <= next);
    }
    setCellCount(next);
    setCellData(nextData);
    scheduleSave(next, nextData);
  }

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(BVM_STATUS_OPTIONS.map((o) => [o.value, 0]));
    let filled = 0;
    for (const c of cellData) {
      if (c.status && counts[c.status] !== undefined) {
        counts[c.status]++;
        filled++;
      }
    }
    return { counts, filled };
  }, [cellData]);

  const pieData = BVM_STATUS_OPTIONS.map((o) => ({ name: o.label, value: breakdown.counts[o.value] })).filter((d) => d.value > 0);

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Call Consistency</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Daily call grid — auto-saves as you go {saving && <span className="text-emerald-400">(saving…)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
        <span className="text-[11px] font-mono uppercase text-slate-500">Grid size: {cellCount} cells</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => resizeGrid(-STEP)}
            disabled={cellCount <= MIN_CELLS}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => resizeGrid(STEP)}
            disabled={cellCount >= MAX_CELLS}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {cellData.map((cell) => {
              const color = cell.status ? BVM_STATUS_COLOR[cell.status] : undefined;
              return (
                <div
                  key={cell.cellNumber}
                  className="rounded-lg border border-slate-800 overflow-hidden flex flex-col"
                  style={color ? { borderColor: color } : undefined}
                >
                  <span className="text-[9px] font-mono text-slate-500 text-center pt-1">{cell.cellNumber}</span>
                  <select
                    value={cell.status || ''}
                    onChange={(e) => setCellStatus(cell.cellNumber, e.target.value || null)}
                    className="w-full text-[10px] font-bold text-center py-1.5 bg-slate-950 focus:outline-none cursor-pointer"
                    style={color ? { color, backgroundColor: `${color}1A` } : { color: '#64748b' }}
                  >
                    <option value="">—</option>
                    {BVM_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} style={{ color: '#000' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Daily Breakdown</h3>
          <div className="space-y-2">
            {BVM_STATUS_OPTIONS.map((o) => (
              <div key={o.value} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </span>
                <span className="text-white font-bold tabular-nums">{breakdown.counts[o.value]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
              <span className="text-slate-500 uppercase">Total Calls</span>
              <span className="text-emerald-400 font-bold tabular-nums">{breakdown.filled} / {cellCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Category Split</h3>
          {pieData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No calls logged yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} label={(d) => `${d.name} ${Math.round((d.value / breakdown.filled) * 100)}%`}>
                  {pieData.map((d, i) => {
                    const opt = BVM_STATUS_OPTIONS.find((o) => o.label === d.name);
                    return <Cell key={i} fill={opt?.color || '#64748b'} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
