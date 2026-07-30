'use client';

import React, { useEffect, useState } from 'react';
import { Users, BarChart3, ShieldCheck, TrendingUp } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics?orgId=default-tenant-workspace')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server responded with status ${res.status}: ${text.slice(0, 100)}`);
        }
        return res.json();
      })
      .then((resData) => {
        // Double-check that all required objects exist before assigning them
        if (!resData || typeof resData !== 'object') {
          throw new Error('API returned invalid JSON data structure.');
        }
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Diagnostic caught a crash:", err);
        setErrorState(err.message || 'Unknown engine failure');
        setLoading(false);
      });
  }, []);

  // 🛡️ If an error happens, display this instead of crashing the page!
  if (errorState) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl max-w-7xl mx-auto my-4 text-white">
        <h3 className="text-red-400 font-semibold flex items-center gap-2">
          ⚠️ Analytics Diagnostic Shield Activated
        </h3>
        <p className="text-slate-300 text-sm mt-2">
          The dashboard caught a background data failure instead of crashing the tab.
        </p>
        <div className="mt-3 bg-black/40 p-3 rounded font-mono text-xs text-red-300 border border-black/60 overflow-x-auto">
          {errorState}
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto animate-pulse">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <span className="h-6 w-72 bg-slate-800 rounded" />
          <span className="h-6 w-24 bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
              <div className="space-y-2">
                <span className="block h-3 w-28 bg-slate-800 rounded" />
                <span className="block h-7 w-16 bg-slate-800 rounded" />
              </div>
              <span className="h-8 w-8 bg-slate-800 rounded-full shrink-0" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <span className="block h-4 w-40 bg-slate-800 rounded mb-3" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between gap-4">
                  <span className="h-3 w-16 bg-slate-800 rounded shrink-0" />
                  <span className="flex-1 h-3 bg-slate-800 rounded-full" />
                  <span className="h-3 w-6 bg-slate-800 rounded shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const summary = data.summary || { totalLeads: 0, totalOrgs: 0, avgLeadScore: 0, avgAuditScore: 0 };
  const growthData = data.growthData || [];
  const statusData = data.statusData || [];

  return (
    <div className="space-y-6 p-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">System Performance & Lead Analytics</h1>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Shield Running</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Inbound Leads</p>
            <h3 className="text-3xl font-bold mt-1 font-mono tabular-nums">{summary.totalLeads}</h3>
          </div>
          <Users className="text-blue-500 h-8 w-8" />
        </div>
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Active Organizations</p>
            <h3 className="text-3xl font-bold mt-1 font-mono tabular-nums">{summary.totalOrgs}</h3>
          </div>
          <BarChart3 className="text-emerald-500 h-8 w-8" />
        </div>
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Avg Lead Score</p>
            <h3 className="text-3xl font-bold mt-1 font-mono tabular-nums">{summary.avgLeadScore}/100</h3>
          </div>
          <ShieldCheck className="text-amber-500 h-8 w-8" />
        </div>
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Avg Audit Score</p>
            <h3 className="text-3xl font-bold mt-1 font-mono tabular-nums">{summary.avgAuditScore}/100</h3>
          </div>
          <TrendingUp className="text-purple-500 h-8 w-8" />
        </div>
      </div>

      {/* Visual Analytics Grid using native CSS bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-300">Lead Velocity Timeline</h4>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" /> Leads / period
            </span>
          </div>
          <div className="space-y-3">
            {growthData.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
                title={`${item.date}: ${item.count} lead${item.count === 1 ? '' : 's'}`}
              >
                <span className="text-slate-400 font-mono tabular-nums w-20">{item.date}</span>
                <div className="flex-1 mx-4 bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (item.count / Math.max(1, summary.totalLeads)) * 100)}%` }}
                  />
                </div>
                <span className="font-semibold text-white font-mono tabular-nums w-6 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-300">Conversion Pipeline Metrics</h4>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" /> Orgs / stage
            </span>
          </div>
          <div className="space-y-3">
            {statusData.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
                title={`${item.name}: ${item.value}`}
              >
                <span className="text-slate-400 font-mono tabular-nums w-24 truncate">{item.name}</span>
                <div className="flex-1 mx-4 bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (item.value / Math.max(1, summary.totalOrgs)) * 100)}%` }}
                  />
                </div>
                <span className="font-semibold text-white font-mono tabular-nums w-6 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}