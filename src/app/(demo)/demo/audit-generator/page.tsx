'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Fira_Code } from 'next/font/google';
import {
  Search,
  Gauge,
  MapPin,
  PhoneMissed,
  DollarSign,
  Loader2,
  Star,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import DemoPortalNav from '@/components/demo/DemoPortalNav';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

// Google local-search CTR-by-position benchmarks, same table used by the
// full report generator (src/app/reports/[id]/page.tsx) so the "missed
// revenue" story stays consistent across every tool that quotes it.
const CTR_BY_RANK: Record<number, number> = {
  1: 39.8, 2: 18.7, 3: 10.2, 4: 1.8, 5: 1.4,
  6: 1.2, 7: 1.0, 8: 0.9, 9: 0.8, 10: 0.7,
};

function ctrForRank(rank: number | null): number {
  if (rank === null || rank > 10 || rank < 1) return 0.5;
  return CTR_BY_RANK[rank] ?? 0.5;
}

// ponytail: fixed local-search-volume + conversion-rate assumptions, not
// pulled from a real keyword-volume API. Good enough for a live-pitch
// estimate; swap for a real volume source if this needs to hold up to
// prospect scrutiny post-sale.
const ASSUMED_MONTHLY_SEARCHES = 300;
const ASSUMED_CONVERSION_RATE = 0.1;

interface SpeedResult {
  score: number;
  lcp: string;
  status: 'pass' | 'fail';
  isRealGoogleData: boolean;
}

interface RankResult {
  rank: string;
  competitors: { name: string; reviews: number; rating: string }[];
  estimationMode: boolean;
  notice: string;
}

interface AuditResult {
  businessName: string;
  url: string;
  speed: SpeedResult;
  rankData: RankResult;
  parsedRank: number | null;
  overallScore: number;
  missedCallsPerMonth: number;
  missedRevenuePerMonth: number;
}

function scoreColor(score: number) {
  if (score >= 70) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
  if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
  return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30' };
}

export default function AuditGeneratorPage() {
  const [businessName, setBusinessName] = useState('');
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [avgJobValue, setAvgJobValue] = useState(250);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [savingLead, setSavingLead] = useState(false);

  const generateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !url.trim()) {
      toast.error('Enter a business name and website URL first.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const keyword = targetKeyword.trim() || `${businessName} near me`;
      const [speedRes, rankRes] = await Promise.all([
        fetch(`/api/audit/speed?url=${encodeURIComponent(url)}`),
        fetch(`/api/audit/rank?domain=${encodeURIComponent(url)}&keyword=${encodeURIComponent(keyword)}`),
      ]);

      const speed: SpeedResult = await speedRes.json();
      const rankData: RankResult = await rankRes.json();

      const rankMatch = String(rankData.rank).match(/\d+/);
      const parsedRank = rankMatch ? parseInt(rankMatch[0], 10) : null;
      const ctr = ctrForRank(parsedRank);
      const topCtr = CTR_BY_RANK[1];
      const ctrGap = Math.max(0, (topCtr - ctr) / 100);

      const missedCallsPerMonth = Math.round(ASSUMED_MONTHLY_SEARCHES * ctrGap * ASSUMED_CONVERSION_RATE);
      const missedRevenuePerMonth = Math.round(missedCallsPerMonth * (avgJobValue || 250));

      const rankScore = parsedRank === null ? 20 : parsedRank <= 3 ? 90 : parsedRank <= 10 ? 55 : 20;
      const overallScore = Math.round((speed.score + rankScore) / 2);

      setResult({
        businessName,
        url,
        speed,
        rankData,
        parsedRank,
        overallScore,
        missedCallsPerMonth,
        missedRevenuePerMonth,
      });
    } catch {
      toast.error('Audit generation failed — check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToCrm = async () => {
    if (!result) return;
    setSavingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: result.businessName,
          url: result.url,
          estimatedLoss: result.missedRevenuePerMonth,
          industry: 'Home Services',
          stage: 'New Lead',
          aiPriority: result.overallScore < 40 ? 'Urgent' : 'Stable',
          memo: `Live audit: Speed ${result.speed.score}/100, Local rank ${result.rankData.rank}, est. ${result.missedCallsPerMonth} missed calls/mo.`,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`"${result.businessName}" added to CRM Pipeline`);
    } catch {
      toast.error('Failed to save lead to CRM');
    } finally {
      setSavingLead(false);
    }
  };

  const overall = result ? scoreColor(result.overallScore) : null;
  const speedColors = result ? scoreColor(result.speed.score) : null;

  return (
    <div
      className={`${firaCode.variable} min-h-screen bg-[#0F172A] text-gray-200 antialiased relative overflow-hidden`}
    >
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-8 max-w-5xl mx-auto space-y-6 font-sans">
        <DemoPortalNav />

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> PROSPECTING DEMO
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Prospect Audit Generator</h1>
          <p className="text-xs text-slate-400">
            Enter a prospect's business to generate a live Missed Revenue &amp; Missed Call Audit.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={generateAudit}
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Business Name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Apex Mechanical Services"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Website URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="apexmechanicalmn.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">
              Target Keyword <span className="text-slate-600">(optional)</span>
            </label>
            <input
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="emergency plumber near me"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Avg. Job Value ($)</label>
            <input
              type="number"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Scanning…' : 'Generate Audit'}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Overall score banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Audit Score</span>
                <h2 className="text-xl font-black text-white">{result.businessName}</h2>
                <p className="text-[10px] text-slate-500 font-mono">{result.url}</p>
              </div>
              <div
                className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center ${overall!.bg} ${overall!.border}`}
              >
                <span className={`text-3xl font-black font-mono ${overall!.text}`}>{result.overallScore}</span>
                <span className="text-[8px] text-slate-500 font-mono">/ 100</span>
              </div>
            </div>

            {/* Breakdown tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-sky-400" /> Site Speed
                </span>
                <p className={`text-2xl font-black font-mono ${speedColors!.text}`}>{result.speed.score}/100</p>
                <p className="text-[10px] text-slate-500 font-mono">LCP: {result.speed.lcp}</p>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                    result.speed.status === 'pass'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {result.speed.status === 'pass' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  {result.speed.status === 'pass' ? 'Passing' : 'Failing'}
                </span>
                {!result.speed.isRealGoogleData && (
                  <p className="text-[9px] text-slate-600 font-mono">Estimated (live scan unavailable)</p>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Local Search Rank
                </span>
                <p className="text-2xl font-black font-mono text-white">{result.rankData.rank}</p>
                <div className="space-y-1 pt-1">
                  {result.rankData.competitors.slice(0, 2).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[140px]">{c.name}</span>
                      <span className="flex items-center gap-1 font-mono text-amber-300">
                        <Star className="w-2.5 h-2.5" /> {c.rating} ({c.reviews})
                      </span>
                    </div>
                  ))}
                </div>
                {result.rankData.estimationMode && (
                  <p className="text-[9px] text-slate-600 font-mono">Estimated regional index</p>
                )}
              </div>

              <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <PhoneMissed className="w-3.5 h-3.5 text-rose-400" /> Missed Revenue
                </span>
                <p className="text-2xl font-black font-mono text-rose-400">
                  ${result.missedRevenuePerMonth.toLocaleString()}/mo
                </p>
                <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> ~{result.missedCallsPerMonth} missed calls/mo
                </p>
              </div>
            </div>

            <button
              onClick={addToCrm}
              disabled={savingLead}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {savingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add to CRM Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
