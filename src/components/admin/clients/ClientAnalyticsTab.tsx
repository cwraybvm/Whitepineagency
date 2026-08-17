'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AnalyticsData {
  revenue: {
    totalInvoiced: number;
    outstanding: number;
    paidAmount: number;
    canceledAmount: number;
    paidRatio: number | null;
    avgResolutionDays: number | null;
    subscriptionCount: number;
  };
  tasks: {
    totalCreated: number;
    totalCompleted: number;
    completionRate: number | null;
    avgTurnaroundDays: number | null;
    velocity: {
      windowDays: 30 | 60;
      weeks: { weekStart: string; completed: number }[];
    };
  };
  expenses: {
    totalExpenses: number;
    totalMileageCost: number;
    totalMiles: number;
  };
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="text-gray-400 text-xs uppercase font-mono">{label}</div>
      <div className="text-white text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse">
      <div className="h-3 w-20 bg-white/10 rounded" />
      <div className="h-7 w-24 bg-white/10 rounded mt-2" />
    </div>
  );
}

export default function ClientAnalyticsTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window_, setWindow] = useState<30 | 60>(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/analytics?days=${window_}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return res.json();
      })
      .then(setData)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [clientId, window_]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 h-24 animate-pulse" />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 h-40 animate-pulse" />
      </div>
    );
  }

  const { revenue, tasks, expenses } = data;
  const avgVelocity =
    tasks.velocity.weeks.length > 0
      ? tasks.velocity.weeks.reduce((sum, w) => sum + w.completed, 0) / tasks.velocity.weeks.length
      : 0;

  const statusTotal = revenue.paidAmount + revenue.outstanding + revenue.canceledAmount;
  const maxWeek = Math.max(1, ...tasks.velocity.weeks.map((w) => w.completed));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={money(revenue.totalInvoiced)} />
        <KpiCard label="Outstanding Balance" value={money(revenue.outstanding)} />
        <KpiCard label="Task Velocity" value={`${avgVelocity.toFixed(1)}/wk`} />
        <KpiCard
          label="Avg Turnaround Time"
          value={tasks.avgTurnaroundDays !== null ? `${tasks.avgTurnaroundDays}d` : '—'}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="text-gray-400 text-xs uppercase font-mono">Invoice Status Distribution</div>
        {revenue.subscriptionCount === 0 || statusTotal === 0 ? (
          <div className="text-gray-500 text-sm">No invoices yet.</div>
        ) : (
          <>
            <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
              {revenue.paidAmount > 0 && (
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(revenue.paidAmount / statusTotal) * 100}%` }}
                  title={`Paid: ${money(revenue.paidAmount)}`}
                />
              )}
              {revenue.outstanding > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(revenue.outstanding / statusTotal) * 100}%` }}
                  title={`Overdue: ${money(revenue.outstanding)}`}
                />
              )}
              {revenue.canceledAmount > 0 && (
                <div
                  className="bg-gray-500"
                  style={{ width: `${(revenue.canceledAmount / statusTotal) * 100}%` }}
                  title={`Canceled: ${money(revenue.canceledAmount)}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />Paid {money(revenue.paidAmount)}</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />Overdue {money(revenue.outstanding)}</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1.5" />Canceled {money(revenue.canceledAmount)}</span>
            </div>
            <div className="text-gray-500 text-xs">
              Avg. resolution ≈ {revenue.avgResolutionDays !== null ? `${revenue.avgResolutionDays} days` : '—'} (approx.)
            </div>
          </>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-xs uppercase font-mono">Task Completion Trend</div>
          <div className="flex gap-1">
            {([30, 60] as const).map((d) => (
              <button
                key={d}
                onClick={() => setWindow(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  window_ === d ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {tasks.totalCreated === 0 ? (
          <div className="text-gray-500 text-sm">No tasks yet.</div>
        ) : (
          <>
            <div className="flex items-end gap-2 h-28">
              {tasks.velocity.weeks.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1" title={`${w.weekStart}: ${w.completed} completed`}>
                  <div
                    className="w-full bg-emerald-500/70 rounded-t"
                    style={{ height: `${Math.max(4, (w.completed / maxWeek) * 100)}%` }}
                  />
                  <div className="text-[10px] text-gray-500 font-mono">
                    {new Date(w.weekStart).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-gray-500 text-xs">
              {tasks.totalCompleted} of {tasks.totalCreated} tasks completed
              {tasks.completionRate !== null && ` (${Math.round(tasks.completionRate * 100)}%)`}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-gray-400 text-xs uppercase font-mono">Total Expenses</div>
          {expenses.totalExpenses === 0 ? (
            <div className="text-gray-500 text-sm mt-1">No expenses logged.</div>
          ) : (
            <div className="text-white text-xl font-bold mt-1">{money(expenses.totalExpenses)}</div>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-gray-400 text-xs uppercase font-mono">Total Mileage</div>
          {expenses.totalMileageCost === 0 && expenses.totalMiles === 0 ? (
            <div className="text-gray-500 text-sm mt-1">No mileage logged.</div>
          ) : (
            <div className="text-white text-xl font-bold mt-1">
              {money(expenses.totalMileageCost)} <span className="text-gray-500 text-sm font-normal">/ {expenses.totalMiles.toLocaleString()} mi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
