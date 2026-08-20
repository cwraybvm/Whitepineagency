'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { FileBarChart2, Loader2, Filter, Target } from 'lucide-react';
import { BVM_STATUS_OPTIONS } from '@/lib/bvmStatus';
import { weekRange } from '@/lib/weekRange';
import CopyWeeklyDigestButton from '@/components/admin/CopyWeeklyDigestButton';
import AddIncentiveGoalButton from '@/components/admin/AddIncentiveGoalButton';

interface DisciplineLog {
  date: string;
  pagesRead: number;
  jiuJitsu: boolean;
  workout: boolean;
  waterGlasses: number;
}

const PAGES_TARGET = 10;
const WATER_TARGET = 7;
const WEEKLY_TARGET = 2;
const WEEK_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Range = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportData {
  range: Range;
  startDate: string;
  endDate: string;
  totalCalls: number;
  statusCounts: Record<string, number>;
  leadsAddedTotal: number;
  leadCallConversionRate: number;
  conferenceCallCount: number;
  conferenceAttendedCount: number;
  conferenceAttendanceRate: number;
  newAddressesTotal: number;
  newAddressesSentToBvm: number;
  funnel: {
    totalCalls: number;
    connects: number;
    appointmentsScheduled: number;
    closedDeals: number;
  };
}

const FUNNEL_COLORS = ['#0EA5E9', '#22C55E', '#F97316', '#A855F7'];

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
  const [disciplineWeek, setDisciplineWeek] = useState<DisciplineLog[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bvm/reports?range=${range}&date=${date}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, [range, date]);

  // Always the calendar week containing `date`, independent of the
  // daily/weekly/monthly/yearly range tabs above -- "2 days/week" and
  // "10 pages/day avg" targets only mean something against a real week.
  useEffect(() => {
    setDisciplineLoading(true);
    const { start, end } = weekRange(date);
    fetch(`/api/consistent-discipline?start=${start}&end=${end}`)
      .then((res) => res.json())
      .then(setDisciplineWeek)
      .catch(() => toast.error('Failed to load discipline report'))
      .finally(() => setDisciplineLoading(false));
  }, [date]);

  const chartData = data
    ? BVM_STATUS_OPTIONS.map((o) => ({
        name: o.label,
        color: o.color,
        value: showPercent && data.totalCalls > 0 ? Math.round((data.statusCounts[o.value] / data.totalCalls) * 100) : data.statusCounts[o.value],
      }))
    : [];

  const disciplineByDate = new Map(disciplineWeek.map((l) => [l.date, l]));
  const weekStart = weekRange(date).start;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const log = disciplineByDate.get(dateStr);
    const compliance = log
      ? [log.pagesRead >= PAGES_TARGET, log.waterGlasses >= WATER_TARGET, log.jiuJitsu, log.workout].filter(Boolean).length
      : 0;
    return { label: WEEK_DAY_LABELS[i], dateStr, compliance };
  });
  const jiuJitsuWeekCount = disciplineWeek.filter((l) => l.jiuJitsu).length;
  const workoutWeekCount = disciplineWeek.filter((l) => l.workout).length;
  const avgPagesRead = disciplineWeek.length > 0 ? Math.round(disciplineWeek.reduce((sum, l) => sum + l.pagesRead, 0) / 7) : 0;
  const avgWaterGlasses = disciplineWeek.length > 0 ? Math.round(disciplineWeek.reduce((sum, l) => sum + l.waterGlasses, 0) / 7) : 0;
  const COMPLIANCE_COLORS = ['#1e293b', '#0c4a6e', '#0369a1', '#0284c7', '#22c55e'];

  const funnelData = data
    ? [
        { name: 'Total Calls Made', value: data.funnel.totalCalls, fill: FUNNEL_COLORS[0] },
        { name: 'Connects (Yes/LMGK)', value: data.funnel.connects, fill: FUNNEL_COLORS[1] },
        { name: 'Appointments Scheduled', value: data.funnel.appointmentsScheduled, fill: FUNNEL_COLORS[2] },
        { name: 'Closed Deals', value: data.funnel.closedDeals, fill: FUNNEL_COLORS[3] },
      ]
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
        <div className="flex flex-wrap items-center gap-2">
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
          <CopyWeeklyDigestButton date={date} />
          <AddIncentiveGoalButton />
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">Total Calls</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{data.totalCalls}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-mono uppercase text-slate-500">Leads Added</p>
              <p className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">{data.leadsAddedTotal}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{data.leadCallConversionRate}% of calls</p>
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

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Conversion Funnel</h3>
            </div>
            {data.funnel.totalCalls === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No calls logged in this window</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" dataKey="name" fill="#e2e8f0" stroke="none" fontSize={11} />
                    <LabelList position="center" dataKey="value" fill="#020617" stroke="none" fontSize={13} fontWeight={700} />
                    {funnelData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {funnelData.map((d) => (
                <div key={d.name} className="text-center">
                  <p className="text-[9px] font-mono uppercase text-slate-500 truncate">{d.name}</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: d.fill }}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Consistent Discipline Weekly Overview</h3>
            </div>
            {disciplineLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[11px] font-mono uppercase text-slate-500">Jiu-Jitsu</p>
                    <p className="text-lg font-bold text-white tabular-nums">{jiuJitsuWeekCount} / {WEEKLY_TARGET} days</p>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (jiuJitsuWeekCount / WEEKLY_TARGET) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono uppercase text-slate-500">Workout</p>
                    <p className="text-lg font-bold text-white tabular-nums">{workoutWeekCount} / {WEEKLY_TARGET} days</p>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (workoutWeekCount / WEEKLY_TARGET) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono uppercase text-slate-500">Avg. Pages Read</p>
                    <p className="text-lg font-bold text-white tabular-nums">{avgPagesRead} / {PAGES_TARGET}</p>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (avgPagesRead / PAGES_TARGET) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono uppercase text-slate-500">Avg. Water</p>
                    <p className="text-lg font-bold text-white tabular-nums">{avgWaterGlasses} / {WATER_TARGET}</p>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, (avgWaterGlasses / WATER_TARGET) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-mono uppercase text-slate-500 mb-2">Habit Compliance This Week</p>
                  <div className="flex gap-2">
                    {weekDays.map((d) => (
                      <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full aspect-square rounded-lg border border-slate-800"
                          style={{ backgroundColor: COMPLIANCE_COLORS[d.compliance] }}
                          title={`${d.dateStr}: ${d.compliance}/4 habits hit`}
                        />
                        <span className="text-[9px] font-mono text-slate-500">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
