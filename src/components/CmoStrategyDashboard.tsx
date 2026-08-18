'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, Target, CheckCircle2, Circle, Download } from 'lucide-react';

type AuditSummary = { strengths: string[]; bottlenecks: string[]; opportunities: string[] };
type Milestone = { id: string; month: 'Month 1' | 'Month 2' | 'Month 3'; text: string; status: 'pending' | 'completed' };
type Strategy = { id: string; audit: AuditSummary; roadmapItems: Milestone[]; currentQuarter: string; createdAt: string };

const DEFAULT_PRIMARY = '#2563EB';
const MONTHS = ['Month 1', 'Month 2', 'Month 3'] as const;

const AUDIT_SECTIONS: { key: keyof AuditSummary; label: string; icon: typeof TrendingUp }[] = [
  { key: 'strengths', label: 'Strengths', icon: TrendingUp },
  { key: 'bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
  { key: 'opportunities', label: 'Key Opportunities', icon: Target },
];

export default function CmoStrategyDashboard({ primaryColor, orgName }: { primaryColor: string | null; orgName: string }) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [industry, setIndustry] = useState('');
  const [targetGoals, setTargetGoals] = useState('');

  const color = primaryColor || DEFAULT_PRIMARY;

  useEffect(() => {
    fetch('/api/cmo/generate', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStrategy(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    if (!industry.trim() || !targetGoals.trim()) {
      toast.error('Enter both industry and target goals first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/cmo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, targetGoals }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      setStrategy(data);
      toast.success('CMO strategy updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate CMO strategy');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    if (!strategy) return;
    const nextStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    const prev = strategy;
    setStrategy({
      ...strategy,
      roadmapItems: strategy.roadmapItems.map((m) => (m.id === milestone.id ? { ...m, status: nextStatus } : m)),
    });
    try {
      const res = await fetch('/api/cmo/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: strategy.id, milestoneId: milestone.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update milestone');
    } catch (err: any) {
      setStrategy(prev);
      toast.error(err.message || 'Failed to update milestone');
    }
  };

  const exportPdf = () => {
    if (!strategy || exporting) return;
    setExporting(true);
    // Let the spinner paint before the (blocking) print dialog opens.
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 50);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-8 space-y-6 max-w-[1400px] mx-auto font-sans text-slate-100"
      style={{ ['--portal-primary' as string]: color }}
    >
      <div className="no-print bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span
            className="text-xs font-bold uppercase tracking-widest font-mono block flex items-center gap-1.5"
            style={{ color: 'var(--portal-primary)' }}
          >
            <Sparkles className="w-3.5 h-3.5" /> {strategy?.currentQuarter || 'Fractional CMO'}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Freelance CMO Dashboard</h1>
          <p className="text-xs text-slate-400">AI-generated marketing audit and 90-day quarterly roadmap.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. HVAC services"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Target Goals</label>
            <input
              value={targetGoals}
              onChange={(e) => setTargetGoals(e.target.value)}
              placeholder="e.g. double leads by Q4"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 w-56"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="py-2.5 px-4 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: 'var(--portal-primary)' }}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Update CMO Strategy'}
          </button>
          <button
            onClick={exportPdf}
            disabled={!strategy || exporting}
            className="py-2.5 px-4 bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 border border-slate-700"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? 'Preparing…' : 'Export to PDF'}
          </button>
        </div>
      </div>

      {strategy && (
        <div className="hidden print:flex items-center justify-between border-b-2 pb-3 mb-2" style={{ borderColor: 'var(--portal-primary)' }}>
          <div>
            <div className="text-lg font-black">{orgName}</div>
            <div className="text-xs text-gray-500">Freelance CMO Strategy — {strategy.currentQuarter}</div>
          </div>
          <div className="text-xs text-gray-500">
            Generated {new Date(strategy.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      )}

      {!strategy ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-400 text-sm">
          Enter your industry and target goals, then Update CMO Strategy to generate your audit and roadmap.
        </div>
      ) : (
        <>
          <div className="cmo-print-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            {AUDIT_SECTIONS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="cmo-print-card bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: 'var(--portal-primary)' }} />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{label}</h3>
                </div>
                <ul className="space-y-2">
                  {strategy.audit[key].map((item, i) => (
                    <li key={i} className="text-xs text-slate-300 leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="cmo-roadmap-section cmo-print-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            {MONTHS.map((month) => {
              const items = strategy.roadmapItems.filter((m) => m.month === month);
              return (
                <div key={month} className="cmo-print-card bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{month}</h3>
                  <ul className="space-y-2">
                    {items.map((milestone) => (
                      <li key={milestone.id}>
                        <button
                          onClick={() => toggleMilestone(milestone)}
                          className="w-full flex items-start gap-2 text-left p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                        >
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--portal-primary)' }} />
                          ) : (
                            <Circle className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                          )}
                          <span
                            className={`text-xs leading-relaxed ${
                              milestone.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'
                            }`}
                          >
                            {milestone.text}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
