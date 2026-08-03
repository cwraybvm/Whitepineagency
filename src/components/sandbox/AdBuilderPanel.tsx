'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, ThumbsUp, ImageUp } from 'lucide-react';
import { TONE_OPTIONS, ASPECT_RATIOS, type Tone, type AspectRatioId, type OrgBrand } from './types';
import ScoreBadge from './ScoreBadge';

const PLATFORMS = ['Meta', 'Google', 'LinkedIn'] as const;
type Platform = (typeof PLATFORMS)[number];

type AdDraft = {
  title: string;
  content: string;
  metadata: { headline: string; cta: string };
};

const FALLBACK_BRAND_COLOR = '#0284C7';

export default function AdBuilderPanel() {
  const [prompt, setPrompt] = useState('Roof inspection special for a residential roofing company');
  const [tone, setTone] = useState<Tone>('Urgent');
  const [platform, setPlatform] = useState<Platform>('Meta');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AdDraft | null>(null);

  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('1:1');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch('/api/sandbox/organizations').then((res) => res.json()).then(setOrgs).catch(() => {});
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const brandColor = selectedOrg?.primaryColor || FALLBACK_BRAND_COLOR;
  const activeRatio = ASPECT_RATIOS.find((r) => r.id === aspectRatio)!;

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
    try {
      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ad', prompt, tone, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft({ title: data.title, content: data.content, metadata: data.metadata });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate ad');
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Ad Builder Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Client (for Brand Overlay)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">No client selected (default styling)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Background Image URL</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors ${
              dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-500 text-[10px]">
              <ImageUp className="w-3.5 h-3.5" /> Paste a URL or drag an image here
            </div>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Brief</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  platform === p
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`w-full py-2 rounded-lg text-xs font-bold text-left px-3 transition-all ${
                  tone === t
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
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
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Ad'}
        </button>
      </div>

      {/* RIGHT: Live-preview ad card */}
      <div className="flex flex-col items-center gap-4">
        {/* Aspect ratio tabs */}
        <div className="flex gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setAspectRatio(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                aspectRatio === r.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.id} {r.label}
            </button>
          ))}
        </div>

        {/* Poster canvas: image background, brand overlay on top */}
        <div
          className={`relative w-full ${activeRatio.aspectClass} rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900`}
          style={{ maxWidth: activeRatio.maxWidth }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => toast.error('Could not load that image URL')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-600 text-xs font-mono uppercase text-center px-6">
              Drop or paste an image URL
            </div>
          )}

          {/* Brand color gradient scrim for legibility */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${brandColor}E6 0%, ${brandColor}66 35%, transparent 65%)` }}
          />

          {selectedOrg?.logoUrl && (
            <div className="absolute top-3 left-3 w-10 h-10 rounded-lg bg-white p-1 shadow-lg overflow-hidden">
              <img src={selectedOrg.logoUrl} alt={selectedOrg.name} className="w-full h-full object-contain" />
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 p-5 space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/80">{platform} Ad</span>
            <h3 className="text-xl font-black text-white leading-tight drop-shadow">
              {draft?.metadata.headline || 'Your headline appears here'}
            </h3>
            <p className={`text-sm text-white/90 whitespace-pre-wrap drop-shadow ${aspectRatio === '1.91:1' ? 'line-clamp-2' : 'line-clamp-4'}`}>
              {draft?.content || 'Generate an ad to see the body copy here.'}
            </p>
            <button
              disabled
              style={{ backgroundColor: brandColor }}
              className="mt-2 w-full py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ThumbsUp className="w-3 h-3" /> {draft?.metadata.cta || 'Call to Action'}
            </button>
          </div>
        </div>

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
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
