'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileBarChart2, Loader2 } from 'lucide-react';
import { BVM_STATUS_OPTIONS } from '@/lib/bvmStatus';

type Range = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportData {
  range: Range;
  startDate: string;
  endDate: string;
  totalCalls: number;
  statusCounts: Record<string, number>;
  conferenceCallCount: number;
  conferenceAttendedCount: number;
  conferenceAttendanceRate: number;
  newAddressesTotal: number;
  newAddressesSentToBvm: number;
}

const RANGES: Range[] = ['daily', 'weekly', 'monthly', 'yearly'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BvmReportsPage() {
  const [range, setRange] = useState<Range>('monthly');
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPercent, setShowPercent] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bvm/reports?range=${range}&date=${date}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, [range, date]);

  const chartData = data
    ? BVM_STATUS_OPTIONS.map((o) => ({
        name: o.label,
        color: o.color,
        value: showPercent && data.totalCalls > 0 ? Math.round((data.statusCounts[o.value] / data.totalCalls) * 100) : data.statusCounts[o.value],
      }))
    : [];

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart2 className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">BVM Reports</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">{data ? `${data.startDate} → ${data.endDate}` : ' '}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-[11px] font-mono uppercase font-bold ${range === r ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">Total Calls</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{data.totalCalls}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">Conference Attendance</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{data.conferenceAttendanceRate}%</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">Conference Calls</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{data.conferenceAttendedCount} / {data.conferenceCallCount}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">New Addresses Sent</p>
              <p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">{data.newAddressesSentToBvm} / {data.newAddressesTotal}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Call Count per Status</h3>
              <button
                onClick={() => setShowPercent((v) => !v)}
                className="text-[11px] font-mono uppercase font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              >
                {showPercent ? 'Show Numbers' : 'Show Percentages'}
              </button>
            </div>
            {data.totalCalls === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No calls logged in this window</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} unit={showPercent ? '%' : ''} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
