'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, ImageUp, RefreshCw, History as HistoryIcon } from 'lucide-react';
import { TONE_OPTIONS, ASPECT_RATIOS, type Tone, type AspectRatioId, type OrgBrand } from './types';
import ScoreBadge from './ScoreBadge';
import AdMockupCard from './AdMockupCard';
import HistoryDrawer from './HistoryDrawer';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
import { useSandboxHistory } from '@/hooks/useSandboxHistory';

const PLATFORMS = ['Meta', 'Google', 'LinkedIn'] as const;
type Platform = (typeof PLATFORMS)[number];

type AdDraft = {
  title: string;
  content: string;
  metadata: { headline: string; cta: string };
};

const FALLBACK_BRAND_COLOR = '#059669';

type AdBuilderSnapshot = {
  prompt: string;
  tone: Tone;
  platform: Platform;
  imageUrl: string;
  aspectRatio: AspectRatioId;
  draft: AdDraft | null;
};

export default function AdBuilderPanel() {
  const [prompt, setPrompt] = useState('Roof inspection special for a residential roofing company');
  const [tone, setTone] = useState<Tone>('Urgent');
  const [platform, setPlatform] = useState<Platform>('Meta');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AdDraft | null>(null);

  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('1:1');
  const [dragOver, setDragOver] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useSandboxHistory<AdBuilderSnapshot>('ad', organizationId);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const brandColor = selectedOrg?.primaryColor || FALLBACK_BRAND_COLOR;

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

  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ad', prompt, tone, platform }),
      });
      const newDraft = { title: data.title, content: data.content, metadata: data.metadata };
      setDraft(newDraft);
      history.add(`[${platform}] ${prompt.slice(0, 60)}`, { prompt, tone, platform, imageUrl, aspectRatio, draft: newDraft });
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate ad');
    } finally {
      setGenerating(false);
    }
  };

  const restoreFromHistory = (snapshot: AdBuilderSnapshot) => {
    setPrompt(snapshot.prompt);
    setTone(snapshot.tone);
    setPlatform(snapshot.platform);
    setImageUrl(snapshot.imageUrl);
    setAspectRatio(snapshot.aspectRatio);
    setDraft(snapshot.draft);
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
          type: 'AD',
          content: draft.content,
          metadata: { ...draft.metadata, tone, platform, imageUrl, aspectRatio, brandOrgId: organizationId || null },
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
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Builder Controls</h2>
          <button
            onClick={() => setHistoryOpen(true)}
            className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            title="Generation history"
          >
            <HistoryIcon className="w-4 h-4" />
            {history.items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {history.items.length}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client (for Brand Overlay)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            <option value="">No client selected (default styling)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Background Image URL</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors ${
              dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-slate-300 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]">
              <ImageUp className="w-3.5 h-3.5" /> Paste a URL or drag an image here
            </div>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Brief</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  platform === p
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`w-full py-2 rounded-lg text-xs font-bold text-left px-3 transition-all ${
                  tone === t
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating || !prompt}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Ad'}
        </button>
      </div>

      {/* RIGHT: Live-preview ad card */}
      <div className="flex flex-col items-center gap-4">
        {/* Aspect ratio tabs */}
        <div className="flex gap-1.5 bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl p-1">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setAspectRatio(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                aspectRatio === r.id ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {r.id} {r.label}
            </button>
          ))}
        </div>

        <AdMockupCard
          aspectRatio={aspectRatio}
          imageUrl={imageUrl || undefined}
          brandColor={brandColor}
          logoUrl={selectedOrg?.logoUrl}
          orgName={selectedOrg?.name}
          platform={platform}
          headline={draft?.metadata.headline}
          content={draft?.content}
          cta={draft?.metadata.cta}
          onImageError={() => toast.error('Could not load that image URL')}
        />

        {generationFailed && !draft && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
            <button
              onClick={generate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {draft && (
          <>
            <ScoreBadge
              content={draft.content}
              type="AD"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content, metadata: r.metadata || draft.metadata })}
            />
            <button
              onClick={saveToStaged}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </>
        )}
      </div>

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history.items}
        onRestore={restoreFromHistory}
        onClear={history.clear}
      />
    </div>
  );
}
