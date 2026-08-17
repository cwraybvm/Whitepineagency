'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Award, Compass, Plus, BarChart3 } from 'lucide-react';

interface Kpi {
  id: string;
  metricName: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  period: string;
}

export default function CmoExecutiveDashboard({ organizationId }: { organizationId: string }) {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, [organizationId]);

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cmo/kpis?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setKpis(data);
      }
    } catch (err) {
      console.error('KPI fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Executive CMO Command Center</h2>
            <p className="text-xs text-neutral-400">Quarterly growth metrics & high-level marketing roadmap</p>
          </div>
        </div>
      </div>

      {/* KPI Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const progressPercent = Math.min(Math.round((kpi.currentValue / kpi.targetValue) * 100), 100);
          return (
            <div key={kpi.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">{kpi.metricName}</span>
                <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {kpi.period}
                </span>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white">
                  {kpi.unit === '$' ? `$${kpi.currentValue.toLocaleString()}` : kpi.currentValue}
                </span>
                <span className="text-xs text-neutral-500">
                  / {kpi.unit === '$' ? `$${kpi.targetValue.toLocaleString()}` : `${kpi.targetValue} ${kpi.unit}`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Target Progress</span>
                  <span className="font-semibold text-indigo-300">{progressPercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategic Quarterly Roadmap */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-800 pb-3">
          <Compass className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Quarterly CMO Strategy Roadmap</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Phase 1 • Acquisition</span>
            <h4 className="text-xs font-semibold text-white">Omnichannel Lead Generation Engine</h4>
            <p className="text-[11px] text-neutral-400">Scale targeted Google & Meta Ad campaigns paired with automated lead auditing.</p>
          </div>

          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-2">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Phase 2 • Authority</span>
            <h4 className="text-xs font-semibold text-white">AI Social Content Batching</h4>
            <p className="text-[11px] text-neutral-400">Publish 3x weekly across LinkedIn, Instagram, and Twitter using optimized release packs.</p>
          </div>

          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Phase 3 • Retain</span>
            <h4 className="text-xs font-semibold text-white">Email & SMS Nurture Loops</h4>
            <p className="text-[11px] text-neutral-400">Automate weekly newsletter drops via Mailchimp and instant SMS follow-ups via Twilio.</p>
          </div>
        </div>
      </div>
    </div>
  );
}