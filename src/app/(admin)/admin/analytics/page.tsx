'use client';

import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'current' | 'competitors' | 'industry'>('current');

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto font-mono text-xs">

      {/* Context Top Controller header block */}
      <div className="border-b border-slate-800 pb-3">
        <span className="text-xs uppercase tracking-widest font-mono text-slate-500 block">System Telemetry Network</span>
        <h1 className="text-xl md:text-2xl font-black text-white font-sans mt-0.5 tracking-tight">Analytical Operations Hub</h1>
      </div>

      {/* Persistent Graphics Dashboard Section */}
      <div className="w-full">
        <AnalyticsDashboard />
      </div>

      {/* Competitive Benchmark Analytics Deck Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Strategic Competitive Benchmarking
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Compare live optimization signatures directly against broad ecosystem indexes.</p>
          </div>
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl gap-1 font-mono text-xs no-print self-start">
            {(['current', 'competitors', 'industry'] as const).map((tab) => (
              <button
                key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-bold transition-all capitalize cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab === 'current' ? 'Entity Score' : tab === 'competitors' ? 'Competitor Avg' : 'Industry Leader'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Mobile Core Performance', current: '36/100', comp: '62/100', top: '94/100' },
            { label: 'ADA Compliance Score', current: '14 Flaws', comp: '4 Flaws', top: '0 Faults' },
            { label: 'SEO Map Index Positioning', current: 'Outside Top 3', comp: 'Pos. #4', top: 'Pos. #1' },
            { label: 'SSL Cryptographic Health', current: '71 Days', comp: '180 Days', top: '345 Days' }
          ].map((metric, idx) => {
            const shown = activeTab === 'current' ? metric.current : activeTab === 'competitors' ? metric.comp : metric.top;
            return (
              <div
                key={idx}
                title={`${metric.label} — Entity: ${metric.current} · Competitor Avg: ${metric.comp} · Industry Leader: ${metric.top}`}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-colors p-3 rounded-xl font-mono cursor-default"
              >
                <span className="text-[10px] uppercase text-slate-500 font-bold block leading-tight mb-2 font-sans">{metric.label}</span>
                <span className="text-lg font-black text-white tabular-nums">{shown}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}