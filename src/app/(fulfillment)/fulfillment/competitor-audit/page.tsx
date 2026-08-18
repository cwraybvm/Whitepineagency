'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Loader2, Download, Globe, Users, TrendingUp, Lightbulb, ExternalLink } from 'lucide-react';
import type { CompetitorAuditResult } from '@/lib/competitorAuditTypes';

function SwotCard({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
      <span className={`text-[10px] font-bold font-mono uppercase ${color}`}>{label}</span>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600">None identified.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-slate-300 flex gap-1.5">
              <span className={color}>&bull;</span> {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CompetitorAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      }
    >
      <CompetitorAuditContent />
    </Suspense>
  );
}

function CompetitorAuditContent() {
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState(searchParams.get('client') || '');
  const [clientUrl, setClientUrl] = useState('');
  const [competitorUrl1, setCompetitorUrl1] = useState('');
  const [competitorUrl2, setCompetitorUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompetitorAuditResult | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientUrl.trim()) {
      toast.error('Client website URL is required');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/audit/competitor-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientUrl: clientUrl.trim(),
          businessName: businessName.trim() || undefined,
          competitorUrls: [competitorUrl1.trim(), competitorUrl2.trim()].filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setResult(data);
      toast.success('Competitive intelligence report generated');
    } catch (err: any) {
      toast.error(err.message || 'Audit failed');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!result) return;
    setExportingPdf(true);
    try {
      const [{ pdf }, { default: CompetitorAuditPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/fulfillment/CompetitorAuditPdf'),
      ]);
      const name = businessName.trim() || result.client.title || 'client';
      const blob = await pdf(<CompetitorAuditPdf businessName={name} data={result} />).toBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-competitive-intel.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1200px] mx-auto font-sans text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> SALES INTELLIGENCE
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">🔍 Client Competitor Audit</h1>
        <p className="text-xs text-slate-400">
          Scan a client&apos;s site, surface up to 2 competitors, and export a Competitive Intelligence Report as a PDF.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={runAudit} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase block">Business Name (optional)</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Apex Mechanical Services"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase block">Client Website URL *</label>
            <input
              value={clientUrl}
              onChange={(e) => setClientUrl(e.target.value)}
              placeholder="https://client-site.com"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase block">Competitor 1 URL (optional)</label>
            <input
              value={competitorUrl1}
              onChange={(e) => setCompetitorUrl1(e.target.value)}
              placeholder="https://competitor-a.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase block">Competitor 2 URL (optional)</label>
            <input
              value={competitorUrl2}
              onChange={(e) => setCompetitorUrl2(e.target.value)}
              placeholder="https://competitor-b.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          Leave a competitor URL blank and the report fills that slot with an AI-estimated competitor archetype — no live search API is configured, so it's clearly labeled, not presented as verified data.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {loading ? 'Scanning sites & generating report…' : 'Run Competitor Audit'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-sm font-bold text-white">{businessName.trim() || result.client.title || result.client.url}</p>
                <a href={result.client.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-sky-400 flex items-center gap-1">
                  {result.client.url} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            {result.speed && (
              <span className="text-[11px] font-mono text-slate-400">
                Perf Score: <strong className="text-white">{result.speed.score}/100</strong> ({result.speed.lcp} LCP)
                {!result.speed.isRealGoogleData && <span className="text-amber-400"> — estimated</span>}
              </span>
            )}
            <button
              onClick={downloadPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exportingPdf ? 'Building PDF…' : 'Download PDF Report'}
            </button>
          </div>

          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">Website &amp; Marketing S.W.O.T.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SwotCard label="Strengths" items={result.swot.strengths} color="text-emerald-400" />
              <SwotCard label="Weaknesses" items={result.swot.weaknesses} color="text-rose-400" />
              <SwotCard label="Opportunities" items={result.swot.opportunities} color="text-sky-400" />
              <SwotCard label="Threats" items={result.swot.threats} color="text-amber-400" />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" /> Top Competitors &amp; Social Positioning
            </h2>
            <div className="space-y-2">
              {result.competitors.map((comp, i) => {
                const note = result.competitorNotes.find((n) => n.name === comp.name);
                return (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white">{comp.name}</span>
                      <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                        comp.source === 'scraped' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {comp.source === 'scraped' ? 'Scanned' : 'AI-Estimated'}
                      </span>
                    </div>
                    {comp.url && (
                      <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-sky-400">
                        {comp.url}
                      </a>
                    )}
                    {note && (
                      <div className="mt-2 space-y-0.5 text-xs text-slate-300">
                        <p><span className="text-slate-500">Social angle:</span> {note.likelySocialAngle}</p>
                        <p><span className="text-slate-500">Positioning:</span> {note.positioningNote}</p>
                      </div>
                    )}
                    {comp.scraped && comp.scraped.socialLinks.length > 0 && (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Active on: {comp.scraped.socialLinks.map((s) => s.platform).join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 3 Quick-Win 7-Day Edge Actions
              </h2>
              <ol className="space-y-2">
                {result.quickWins.map((win, i) => (
                  <li key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 flex gap-2">
                    <span className="w-4 h-4 shrink-0 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    {win}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> 3 Content Strategies
              </h2>
              <div className="space-y-2">
                {result.contentStrategies.map((strategy, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <p className="text-xs font-bold text-white">{i + 1}. {strategy.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{strategy.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
