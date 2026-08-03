'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Quote, CheckCircle2, ArrowRight, LayoutPanelTop } from 'lucide-react';
import type { LandingPageDraft, OrgBrand } from './types';
import ScoreBadge from './ScoreBadge';

type SourceMode = 'asset' | 'brief';

function normalizeMetadata(metadata: any): LandingPageDraft['metadata'] {
  return {
    heroHeadline: metadata?.heroHeadline || '',
    subheadline: metadata?.subheadline || '',
    primaryCta: metadata?.primaryCta || '',
    valueProps: Array.isArray(metadata?.valueProps) ? metadata.valueProps : [],
    testimonial: metadata?.testimonial || '',
  };
}

export default function LandingPageStudioPanel() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('brief');
  const [prompt, setPrompt] = useState('Emergency roof leak repair, same-day service');
  const [assets, setAssets] = useState<{ id: string; title: string; type: string }[]>([]);
  const [assetId, setAssetId] = useState('');
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);

  useEffect(() => {
    fetch('/api/sandbox/assets').then((res) => res.json()).then(setAssets).catch(() => {});
    fetch('/api/sandbox/organizations').then((res) => res.json()).then(setOrgs).catch(() => {});
  }, []);

  const updateField = (patch: Partial<LandingPageDraft['metadata']>) => {
    setDraft((prev) => (prev ? { ...prev, metadata: { ...prev.metadata, ...patch } } : prev));
  };

  const updateValueProp = (index: number, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const valueProps = [...prev.metadata.valueProps];
      valueProps[index] = value;
      return { ...prev, metadata: { ...prev.metadata, valueProps } };
    });
  };

  const generate = async () => {
    if (sourceMode === 'asset' && !assetId) {
      toast.error('Pick a staged asset first');
      return;
    }
    if (sourceMode === 'brief' && !prompt.trim()) {
      toast.error('Enter a brief first');
      return;
    }
    setGenerating(true);
    try {
      const body =
        sourceMode === 'asset'
          ? { mode: 'asset', assetId, organizationId: organizationId || undefined }
          : { mode: 'brief', prompt, organizationId: organizationId || undefined };
      const res = await fetch('/api/sandbox/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft({ title: data.title, content: data.content, metadata: normalizeMetadata(data.metadata) });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate landing page');
    } finally {
      setGenerating(false);
    }
  };

  const saveToStaged = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          type: 'LANDING_PAGE',
          content: draft.content,
          metadata: draft.metadata,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Landing Page Studio Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSourceMode('brief')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'brief' ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              From Brief
            </button>
            <button
              onClick={() => setSourceMode('asset')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'asset' ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              From Staged Asset
            </button>
          </div>
        </div>

        {sourceMode === 'brief' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Brief</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Staged Asset to Match</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Client (for Brand DNA)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">No client selected (default tone)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Landing Page'}
        </button>
      </div>

      {/* RIGHT: Section previews */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex flex-col">
        {draft ? (
          <div className="flex-1 flex flex-col space-y-5">
            <div className="flex items-center gap-2 text-slate-500">
              <LayoutPanelTop className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase">{draft.title}</span>
            </div>

            <input
              value={draft.metadata.heroHeadline}
              onChange={(e) => updateField({ heroHeadline: e.target.value })}
              className="w-full bg-transparent text-2xl font-black text-white leading-tight focus:outline-none border-b border-transparent focus:border-sky-500 pb-1"
            />
            <textarea
              value={draft.metadata.subheadline}
              onChange={(e) => updateField({ subheadline: e.target.value })}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
            />

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase">Value Propositions</label>
              {draft.metadata.valueProps.map((vp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    value={vp}
                    onChange={(e) => updateValueProp(i, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              ))}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-1.5">
              <Quote className="w-4 h-4 text-slate-500" />
              <textarea
                value={draft.metadata.testimonial}
                onChange={(e) => updateField({ testimonial: e.target.value })}
                rows={2}
                className="w-full bg-transparent text-sm text-slate-300 italic focus:outline-none resize-none"
              />
            </div>

            <div className="w-full py-2.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 bg-indigo-600">
              <input
                value={draft.metadata.primaryCta}
                onChange={(e) => updateField({ primaryCta: e.target.value })}
                className="bg-transparent text-center focus:outline-none w-full"
              />
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </div>

            <ScoreBadge
              content={draft.content}
              type="LANDING_PAGE"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft((prev) => (prev ? { title: r.title || prev.title, content: r.content, metadata: normalizeMetadata(r.metadata || prev.metadata) } : prev))}
            />

            <button
              onClick={saveToStaged}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 mt-auto"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm">
            Pick a source and generate to see the landing page sections here.
          </div>
        )}
      </div>
    </div>
  );
}
