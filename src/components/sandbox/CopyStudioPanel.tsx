'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket, RefreshCw, History as HistoryIcon } from 'lucide-react';
import { TONE_OPTIONS, type Tone, type GeneratedDraft, type AngleDraft, type BrandDna, type CopyStudioMode, type DcoVariant, type SandboxTool } from './types';
import type { BrandDna as ActiveBrandDna } from '@/lib/sandboxPrompts';
import CharLimitBadges from './CharLimitBadges';
import BrandDnaDrawer from './BrandDnaDrawer';
import ScoreBadge from './ScoreBadge';
import CopyButton from './CopyButton';
import HistoryDrawer from './HistoryDrawer';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
import { useSandboxHistory } from '@/hooks/useSandboxHistory';
import { useAbortController } from '@/hooks/useAbortController';

const MODES: { id: CopyStudioMode; label: string; icon: React.ElementType }[] = [
  { id: 'single', label: 'Single', icon: Wand2 },
  { id: 'matrix', label: '5-Angle Matrix', icon: Grid3x3 },
  { id: 'dco', label: 'DCO Personalization', icon: MapPinned },
];

function GenerationFailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}

type CopyStudioSnapshot = {
  mode: CopyStudioMode;
  prompt: string;
  tone: Tone;
  locations: string;
  audienceSegments: string;
  draft: GeneratedDraft | null;
  angleDrafts: AngleDraft[];
  dcoVariants: DcoVariant[];
};

export default function CopyStudioPanel({
  activeBrandDna,
  pendingInsert,
  onInsertConsumed,
}: {
  activeBrandDna?: ActiveBrandDna | null;
  pendingInsert?: { tool: SandboxTool; text: string } | null;
  onInsertConsumed?: () => void;
} = {}) {
  const [prompt, setPrompt] = useState(() =>
    pendingInsert?.tool === 'copy' ? pendingInsert.text : '$79 Spring AC Tune-Up promo for a local HVAC company',
  );
  const [tone, setTone] = useState<Tone>('Direct Response');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [savingSingle, setSavingSingle] = useState(false);

  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [brandDna, setBrandDna] = useState<BrandDna | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [mode, setMode] = useState<CopyStudioMode>('single');
  const [angleDrafts, setAngleDrafts] = useState<AngleDraft[]>([]);
  const [savingAngle, setSavingAngle] = useState<string | null>(null);

  const [locations, setLocations] = useState('Denver, CO, Austin, TX, Tampa, FL');
  const [audienceSegments, setAudienceSegments] = useState('Homeowners, Property Managers');
  const [dcoVariants, setDcoVariants] = useState<DcoVariant[]>([]);
  const [savingDco, setSavingDco] = useState<number | null>(null);
  const [stagingDco, setStagingDco] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useSandboxHistory<CopyStudioSnapshot>('copy', organizationId);
  const { start, cancel } = useAbortController();

  useEffect(() => {
    fetchJsonArray<{ id: string; name: string }>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  useEffect(() => {
    if (pendingInsert?.tool === 'copy') onInsertConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBrandDna = (orgId: string) => {
    if (!orgId) {
      setBrandDna(null);
      return;
    }
    fetch(`/api/sandbox/brand?organizationId=${orgId}`)
      .then((res) => res.json())
      .then(setBrandDna)
      .catch(() => setBrandDna(null));
  };

  useEffect(() => {
    loadBrandDna(organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const selectedOrg = orgs.find((o) => o.id === organizationId);

  const generate = async () => {
    const signal = start();
    setGenerating(true);
    setGenerationFailed(false);
    setDraft(null);
    setAngleDrafts([]);
    setDcoVariants([]);
    try {
      if (mode === 'dco') {
        const locationList = locations.split(',').map((s) => s.trim()).filter(Boolean);
        const segmentList = audienceSegments.split(',').map((s) => s.trim()).filter(Boolean);
        if (locationList.length === 0 || segmentList.length === 0) {
          toast.error('Add at least one location and one audience segment');
          return;
        }
        const data = await fetchGenerationJson('/api/sandbox/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'copy',
            mode: 'dco',
            prompt,
            organizationId: organizationId || undefined,
            locations: locationList,
            audienceSegments: segmentList,
          }),
          signal,
        });
        setDcoVariants(data.variants);
        history.add(`[DCO] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: null, angleDrafts: [], dcoVariants: data.variants,
        });
        return;
      }

      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'copy',
          prompt,
          tone,
          organizationId: organizationId || undefined,
          mode: mode === 'matrix' ? 'matrix' : 'single',
          activeBrandDna: activeBrandDna || undefined,
        }),
        signal,
      });
      if (mode === 'matrix') {
        setAngleDrafts(data.angles);
        history.add(`[Matrix] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: null, angleDrafts: data.angles, dcoVariants: [],
        });
      } else {
        const singleDraft = { title: data.title, content: data.content };
        setDraft(singleDraft);
        history.add(`[Single] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: singleDraft, angleDrafts: [], dcoVariants: [],
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Generation canceled');
      } else {
        setGenerationFailed(true);
        toast.error(err.message || 'Failed to generate copy');
      }
    } finally {
      setGenerating(false);
    }
  };

  const cancelGeneration = () => {
    cancel();
    setGenerating(false);
  };

  const restoreFromHistory = (snapshot: CopyStudioSnapshot) => {
    setMode(snapshot.mode);
    setPrompt(snapshot.prompt);
    setTone(snapshot.tone);
    setLocations(snapshot.locations);
    setAudienceSegments(snapshot.audienceSegments);
    setDraft(snapshot.draft);
    setAngleDrafts(snapshot.angleDrafts);
    setDcoVariants(snapshot.dcoVariants);
  };

  const saveAsset = async (title: string, content: string, metadata: any) => {
    const res = await fetch('/api/sandbox/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type: 'COPY', content, metadata }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
  };

  const saveSingle = async () => {
    if (!draft) return;
    setSavingSingle(true);
    try {
      await saveAsset(draft.title, draft.content, { tone });
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSavingSingle(false);
    }
  };

  const saveAngle = async (index: number) => {
    const a = angleDrafts[index];
    setSavingAngle(a.angle);
    try {
      await saveAsset(a.title, a.content, { angle: a.angle });
      toast.success(`Saved "${a.angle}" to Staged Assets`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSavingAngle(null);
    }
  };

  const saveDcoVariant = async (index: number) => {
    const v = dcoVariants[index];
    setSavingDco(index);
    try {
      await saveAsset(v.title, v.content, { location: v.location, segment: v.segment, dco: true });
      toast.success(`Saved "${v.location} / ${v.segment}" to Staged Assets`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSavingDco(null);
    }
  };

  const stageAllDco = async () => {
    if (dcoVariants.length === 0) return;
    setStagingDco(true);
    try {
      const results = await Promise.all(
        dcoVariants.map((v) => saveAsset(v.title, v.content, { location: v.location, segment: v.segment, dco: true }).then(() => true))
      );
      toast.success(`Staged ${results.length} personalized variants`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to batch stage variants');
    } finally {
      setStagingDco(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Copy Studio Controls</h2>
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
          {organizationId && (
            <div className="flex items-start gap-2 bg-slate-100 border border-slate-300 dark:bg-slate-950 dark:border-slate-800 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex-1">
                {!brandDna
                  ? 'Loading…'
                  : brandDna.brandVoice || brandDna.brandGuidelines
                    ? brandDna.brandVoice || brandDna.brandGuidelines
                    : 'No brand DNA set — using default tone.'}
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0"
                title="Edit Brand DNA"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">{mode === 'dco' ? 'Base Offer / Hook' : 'Brief'}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Mode</label>
          <div className="flex flex-col gap-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`w-full py-2 rounded-lg text-xs font-bold text-left px-3 flex items-center gap-2 transition-all ${
                    mode === m.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'dco' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Locations (comma-separated)</label>
              <input
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Audience Segments (comma-separated)</label>
              <input
                value={audienceSegments}
                onChange={(e) => setAudienceSegments(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
            </div>
          </>
        )}

        {mode === 'single' && (
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
        )}

        {generating ? (
          <div className="flex gap-2">
            <button
              disabled
              className="flex-1 py-2.5 bg-emerald-600 opacity-60 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…
            </button>
            <button
              onClick={cancelGeneration}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={!prompt}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {mode === 'matrix' ? 'Generate 5-Angle Matrix' : mode === 'dco' ? 'Generate DCO Matrix' : 'Generate Copy'}
          </button>
        )}
      </div>

      {/* RIGHT: Draft Canvas */}
      {mode === 'matrix' ? (
        angleDrafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {angleDrafts.map((a, i) => (
              <div key={a.angle} className="relative group bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-3">
                <CopyButton text={a.content} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">{a.angle}</span>
                <textarea
                  value={a.content}
                  onChange={(e) => {
                    const next = [...angleDrafts];
                    next[i] = { ...next[i], content: e.target.value };
                    setAngleDrafts(next);
                  }}
                  rows={5}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
                />
                <CharLimitBadges text={a.content} />
                <ScoreBadge
                  content={a.content}
                  type="COPY"
                  metadata={{ angle: a.angle }}
                  onOptimized={(r) => {
                    const next = [...angleDrafts];
                    next[i] = { ...next[i], content: r.content };
                    setAngleDrafts(next);
                  }}
                />
                <button
                  onClick={() => saveAngle(i)}
                  disabled={savingAngle === a.angle}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                >
                  {savingAngle === a.angle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save to Staged Assets
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your brief, then generate to see all 5 angles here.'}
          </div>
        )
      ) : mode === 'dco' ? (
        dcoVariants.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dcoVariants.map((v, i) => (
                <div key={i} className="relative group bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-3">
                  <CopyButton text={v.content} />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded-full px-2 py-0.5">{v.location}</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-2 py-0.5">{v.segment}</span>
                  </div>
                  <textarea
                    value={v.content}
                    onChange={(e) => {
                      const next = [...dcoVariants];
                      next[i] = { ...next[i], content: e.target.value };
                      setDcoVariants(next);
                    }}
                    rows={5}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
                  />
                  <CharLimitBadges text={v.content} />
                  <ScoreBadge
                    content={v.content}
                    type="COPY"
                    metadata={{ location: v.location, segment: v.segment }}
                    onOptimized={(r) => {
                      const next = [...dcoVariants];
                      next[i] = { ...next[i], content: r.content };
                      setDcoVariants(next);
                    }}
                  />
                  <button
                    onClick={() => saveDcoVariant(i)}
                    disabled={savingDco === i}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                  >
                    {savingDco === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save to Staged Assets
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={stageAllDco}
              disabled={stagingDco}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {stagingDco ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {stagingDco ? 'Staging…' : `Batch Stage All ${dcoVariants.length} Variants`}
            </button>
          </div>
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your base offer, locations, and audience segments, then generate the personalization matrix here.'}
          </div>
        )
      ) : (
        <div className="relative group bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex flex-col">
          {draft ? (
            <div className="flex-1 flex flex-col space-y-4">
              <CopyButton text={draft.content} />
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">{draft.title}</span>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
                />
                <CharLimitBadges text={draft.content} />
                <ScoreBadge
                  content={draft.content}
                  type="COPY"
                  metadata={{ tone }}
                  onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content })}
                />
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
                <button
                  onClick={saveSingle}
                  disabled={savingSingle}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  {savingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingSingle ? 'Saving…' : 'Save to Staged Assets'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
              {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your brief and tone, then generate to see the draft here.'}
            </div>
          )}
        </div>
      )}

      {organizationId && selectedOrg && (
        <BrandDnaDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          organizationId={organizationId}
          organizationName={selectedOrg.name}
          onSaved={() => loadBrandDna(organizationId)}
        />
      )}

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
