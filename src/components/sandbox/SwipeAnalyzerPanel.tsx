'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ScanSearch, Save, Loader2, ImageUp, Sparkles, RefreshCw } from 'lucide-react';
import type { SwipeInsights, RemixResult } from './types';
import ScoreBadge from './ScoreBadge';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';

export default function SwipeAnalyzerPanel() {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [insights, setInsights] = useState<SwipeInsights | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [remix, setRemix] = useState<RemixResult | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | 'ad' | null>(null);

  React.useEffect(() => {
    fetchJsonArray<{ id: string; name: string }>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url) {
      setImageUrl(url.trim());
    } else if (e.dataTransfer.files?.length) {
      toast.error("Local files aren't hosted here — paste an image URL instead (e.g. a Drive share link).");
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysisFailed(false);
    setInsights(null);
    setRemix(null);
    try {
      const data = await fetchGenerationJson('/api/sandbox/analyze-swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', imageUrl }),
      });
      setInsights({
        hookPattern: data.hookPattern,
        visualStyle: data.visualStyle,
        targetAudience: data.targetAudience,
        emotionalTrigger: data.emotionalTrigger,
      });
    } catch (err: any) {
      setAnalysisFailed(true);
      toast.error(err.message || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  const runRemix = async () => {
    if (!insights) return;
    setRemixing(true);
    try {
      const res = await fetch('/api/sandbox/analyze-swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remix', insights, organizationId: organizationId || undefined, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remix failed');
      setRemix({ angles: data.angles, adPreset: data.adPreset });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remix');
    } finally {
      setRemixing(false);
    }
  };

  const saveAsset = async (title: string, type: string, content: string, metadata: any) => {
    const res = await fetch('/api/sandbox/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, content, metadata }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
  };

  const saveAngle = async (i: number) => {
    if (!remix) return;
    setSavingIndex(i);
    try {
      await saveAsset(remix.angles[i].title, 'COPY', remix.angles[i].content, { remixedFrom: insights });
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSavingIndex(null);
    }
  };

  const optimizeAngle = (i: number, content: string, title?: string) => {
    if (!remix) return;
    const angles = [...remix.angles];
    angles[i] = { ...angles[i], title: title || angles[i].title, content };
    setRemix({ ...remix, angles });
  };

  const optimizeAdPreset = (content: string, title?: string, metadata?: any) => {
    if (!remix) return;
    setRemix({ ...remix, adPreset: { title: title || remix.adPreset.title, content, metadata: metadata || remix.adPreset.metadata } });
  };

  const saveAdPreset = async () => {
    if (!remix) return;
    setSavingIndex('ad');
    try {
      await saveAsset(remix.adPreset.title, 'AD', remix.adPreset.content, { ...remix.adPreset.metadata, remixedFrom: insights });
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Swipe File Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client (for Remix Brand DNA)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            <option value="">No client selected (default tone)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Competitor Ad Image URL</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors ${
              dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-slate-300 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]">
              <ImageUp className="w-3.5 h-3.5" /> Paste a URL or drag a screenshot here
            </div>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
            />
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full max-h-48 object-contain rounded-lg border border-slate-300 dark:border-slate-800" onError={() => toast.error('Could not load that image URL')} />
          )}
        </div>

        <button
          onClick={analyze}
          disabled={analyzing || !imageUrl}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
          {analyzing ? 'Analyzing…' : 'Deconstruct Ad'}
        </button>

        {insights && (
          <>
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Your Offer (optional, sharpens the remix)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="e.g. $79 AC tune-up for a local HVAC company"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
            </div>
            <button
              onClick={runRemix}
              disabled={remixing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {remixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {remixing ? 'Remixing…' : `Remix for ${selectedOrg?.name || 'No Client'}`}
            </button>
          </>
        )}
      </div>

      {/* RIGHT: Insights + remix output */}
      <div className="space-y-6">
        {insights ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Hook Pattern', value: insights.hookPattern },
              { label: 'Visual Style', value: insights.visualStyle },
              { label: 'Target Audience', value: insights.targetAudience },
              { label: 'Emotional Trigger', value: insights.emotionalTrigger },
            ].map((f) => (
              <div key={f.label} className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">{f.label}</span>
                <p className="text-sm text-slate-700 dark:text-slate-200">{f.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400 text-sm">
            {analysisFailed ? (
              <>
                <p className="text-sm text-red-500 dark:text-red-400">Analysis failed. This can happen during high demand.</p>
                <button
                  onClick={analyze}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </>
            ) : (
              'Paste a competitor ad image URL and Deconstruct Ad to see the breakdown here.'
            )}
          </div>
        )}

        {remix && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Remixed Angles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {remix.angles.map((a, i) => (
                <div key={i} className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">{a.title}</span>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{a.content}</p>
                  <ScoreBadge content={a.content} type="COPY" onOptimized={(r) => optimizeAngle(i, r.content, r.title)} />
                  <button
                    onClick={() => saveAngle(i)}
                    disabled={savingIndex === i}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                  >
                    {savingIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save to Staged Assets
                  </button>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Canvas Preset</h3>
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{remix.adPreset.metadata.headline}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{remix.adPreset.content}</p>
              <p className="text-xs text-sky-400 font-mono">{remix.adPreset.metadata.cta}</p>
              <ScoreBadge
                content={remix.adPreset.content}
                type="AD"
                metadata={remix.adPreset.metadata}
                onOptimized={(r) => optimizeAdPreset(r.content, r.title, r.metadata)}
              />
              <button
                onClick={saveAdPreset}
                disabled={savingIndex === 'ad'}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
              >
                {savingIndex === 'ad' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save to Staged Assets
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
