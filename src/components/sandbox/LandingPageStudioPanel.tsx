'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Quote, CheckCircle2, LayoutPanelTop, RefreshCw } from 'lucide-react';
import type { LandingPageDraft, OrgBrand } from './types';
import ScoreBadge from './ScoreBadge';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
import { renderLandingPageHtml } from './landingPageHtml';

type SourceMode = 'asset' | 'brief';

function slugify(value: string): string {
  return (value || 'landing-page').replace(/\s+/g, '-').toLowerCase();
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeMetadata(metadata: any): LandingPageDraft['metadata'] {
  return {
    heroHeadline: metadata?.heroHeadline || '',
    subheadline: metadata?.subheadline || '',
    primaryCta: metadata?.primaryCta || '',
    valueProps: Array.isArray(metadata?.valueProps) ? metadata.valueProps : [],
    testimonial: metadata?.testimonial || '',
    guaranteeBadge: metadata?.guaranteeBadge || undefined,
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
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [refiningField, setRefiningField] = useState<string | null>(null);
  const [pushingWp, setPushingWp] = useState(false);
  const [pushingWebhook, setPushingWebhook] = useState(false);

  useEffect(() => {
    fetchJsonArray<{ id: string; title: string; type: string }>('/api/sandbox/assets').then(setAssets);
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const previewHtml = useMemo(
    () => (draft ? renderLandingPageHtml(draft, selectedOrg?.primaryColor) : ''),
    [draft, selectedOrg?.primaryColor],
  );
  const viewportWidth = viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

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
    setGenerationFailed(false);
    try {
      const body =
        sourceMode === 'asset'
          ? { mode: 'asset', assetId, organizationId: organizationId || undefined }
          : { mode: 'brief', prompt, organizationId: organizationId || undefined };
      const data = await fetchGenerationJson('/api/sandbox/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setDraft({ title: data.title, content: data.content, metadata: normalizeMetadata(data.metadata) });
    } catch (err: any) {
      setGenerationFailed(true);
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

  const refineSection = async (field: string, currentValue: string, instruction: string) => {
    setRefiningField(field);
    try {
      const data = await fetchGenerationJson('/api/sandbox/landing-page/refine-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, currentValue, instruction, organizationId: organizationId || undefined }),
      });
      updateField({ [field]: data.text } as Partial<LandingPageDraft['metadata']>);
      toast.success('Section updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refine section');
    } finally {
      setRefiningField(null);
    }
  };

  const copyHtml = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(previewHtml);
      toast.success('Copied HTML to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadHtml = () => {
    if (!draft) return;
    downloadTextFile(`${slugify(draft.title)}.html`, previewHtml, 'text/html');
  };

  const pushToWordpress = async () => {
    if (!draft) return;
    if (!organizationId) {
      toast.error('Select a client organization first');
      return;
    }
    setPushingWp(true);
    try {
      const credsRes = await fetch(`/api/organizations/credentials?organizationId=${organizationId}`);
      const creds = await credsRes.json();
      if (!creds.wordpressUrl || !creds.wordpressUsername || !creds.wordpressAppPass) {
        throw new Error('Missing WordPress credentials in API Vault for this client');
      }
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wpUrl: creds.wordpressUrl,
          wpUsername: creds.wordpressUsername,
          wpAppPassword: creds.wordpressAppPass,
          title: draft.title,
          content: previewHtml,
          postType: 'pages',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish to WordPress');
      toast.success('Draft page created on WordPress');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to WordPress');
    } finally {
      setPushingWp(false);
    }
  };

  const pushToWebhook = async () => {
    if (!draft) return;
    if (!organizationId) {
      toast.error('Select a client organization first');
      return;
    }
    setPushingWebhook(true);
    try {
      const res = await fetch('/api/sandbox/landing-page/deploy-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, title: draft.title, html: previewHtml, metadata: draft.metadata }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Webhook push failed');
      toast[data.delivered ? 'success' : 'error'](data.delivered ? 'Delivered to client webhook' : 'Webhook configured but delivery failed — check the listener');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to webhook');
    } finally {
      setPushingWebhook(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6 items-start">
      {/* LEFT: Controls & Inspector */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Landing Page Studio Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSourceMode('brief')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'brief' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Brief
            </button>
            <button
              onClick={() => setSourceMode('asset')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'asset' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Staged Asset
            </button>
          </div>
        </div>

        {sourceMode === 'brief' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Brief</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Staged Asset to Match</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
            >
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client (for Brand DNA)</label>
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

        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Landing Page'}
        </button>

        {draft && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <LayoutPanelTop className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase">{draft.title}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Hero Headline</label>
                <button
                  onClick={() => refineSection('heroHeadline', draft.metadata.heroHeadline, 'Rewrite this hero headline to be punchier and more compelling')}
                  disabled={refiningField === 'heroHeadline'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'heroHeadline' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <input
                value={draft.metadata.heroHeadline}
                onChange={(e) => updateField({ heroHeadline: e.target.value })}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Subheadline</label>
                <button
                  onClick={() => refineSection('subheadline', draft.metadata.subheadline, 'Rewrite this to increase urgency using scarcity or timeliness language, keep roughly the same length')}
                  disabled={refiningField === 'subheadline'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'subheadline' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Increase Urgency
                </button>
              </div>
              <textarea
                value={draft.metadata.subheadline}
                onChange={(e) => updateField({ subheadline: e.target.value })}
                rows={2}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Value Propositions</label>
              {draft.metadata.valueProps.map((vp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    value={vp}
                    onChange={(e) => updateValueProp(i, e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>
              ))}
            </div>

            <div className="bg-slate-100 border border-slate-300 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-3 space-y-1.5">
              <Quote className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <textarea
                value={draft.metadata.testimonial}
                onChange={(e) => updateField({ testimonial: e.target.value })}
                rows={2}
                className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-300 italic focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Primary CTA</label>
              <input
                value={draft.metadata.primaryCta}
                onChange={(e) => updateField({ primaryCta: e.target.value })}
                className="w-full bg-indigo-600 text-white text-center text-xs font-bold rounded-lg py-2.5 focus:outline-none"
              />
            </div>

            <button
              onClick={() => refineSection('guaranteeBadge', draft.metadata.guaranteeBadge || '', 'Write a short trust or risk-reversal guarantee badge line for this business, e.g. "100% Satisfaction Guaranteed"')}
              disabled={refiningField === 'guaranteeBadge'}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              {refiningField === 'guaranteeBadge' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {draft.metadata.guaranteeBadge ? 'Regenerate Guarantee Badge' : 'Add Guarantee Badge'}
            </button>

            <ScoreBadge
              content={draft.content}
              type="LANDING_PAGE"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft((prev) => (prev ? { title: r.title || prev.title, content: r.content, metadata: normalizeMetadata(r.metadata || prev.metadata) } : prev))}
            />

            <button
              onClick={saveToStaged}
              disabled={saving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={copyHtml}
                className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide"
              >
                Copy Clean HTML
              </button>
              <button
                onClick={downloadHtml}
                className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide"
              >
                Download HTML Bundle
              </button>
              <button
                onClick={pushToWordpress}
                disabled={pushingWp}
                className="py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
              >
                {pushingWp ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Push to WordPress
              </button>
              <button
                onClick={pushToWebhook}
                disabled={pushingWebhook}
                className="py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
              >
                {pushingWebhook ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Push to Webhook
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Live Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {(['mobile', 'tablet', 'desktop'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                viewport === v
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {v === 'mobile' ? 'Mobile 375px' : v === 'tablet' ? 'Tablet 768px' : 'Desktop 100%'}
            </button>
          ))}
        </div>
        <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 min-h-[500px] flex items-center justify-center overflow-auto">
          {draft ? (
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              title="Landing page preview"
              style={{ width: viewportWidth, height: '640px', border: 'none', background: 'white' }}
              className="rounded-lg shadow-lg shrink-0"
            />
          ) : generationFailed ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
              <button
                onClick={generate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
              Pick a source and generate to see the live preview here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
