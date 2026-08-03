'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket } from 'lucide-react';
import { TONE_OPTIONS, type Tone, type GeneratedDraft, type AngleDraft, type BrandDna, type CopyStudioMode, type DcoVariant } from './types';
import CharLimitBadges from './CharLimitBadges';
import BrandDnaDrawer from './BrandDnaDrawer';
import ScoreBadge from './ScoreBadge';

const MODES: { id: CopyStudioMode; label: string; icon: React.ElementType }[] = [
  { id: 'single', label: 'Single', icon: Wand2 },
  { id: 'matrix', label: '5-Angle Matrix', icon: Grid3x3 },
  { id: 'dco', label: 'DCO Personalization', icon: MapPinned },
];

export default function CopyStudioPanel() {
  const [prompt, setPrompt] = useState('$79 Spring AC Tune-Up promo for a local HVAC company');
  const [tone, setTone] = useState<Tone>('Direct Response');
  const [generating, setGenerating] = useState(false);
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

  useEffect(() => {
    fetch('/api/sandbox/organizations').then((res) => res.json()).then(setOrgs).catch(() => {});
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
    setGenerating(true);
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
        const res = await fetch('/api/sandbox/generate', {
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
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        setDcoVariants(data.variants);
        return;
      }

      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'copy',
          prompt,
          tone,
          organizationId: organizationId || undefined,
          mode: mode === 'matrix' ? 'matrix' : 'single',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (mode === 'matrix') {
        setAngleDrafts(data.angles);
      } else {
        setDraft({ title: data.title, content: data.content });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Copy Studio Controls</h2>

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
          {organizationId && (
            <div className="flex items-start gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 flex-1">
                {!brandDna
                  ? 'Loading…'
                  : brandDna.brandVoice || brandDna.brandGuidelines
                    ? brandDna.brandVoice || brandDna.brandGuidelines
                    : 'No brand DNA set — using default tone.'}
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-slate-400 hover:text-white shrink-0"
                title="Edit Brand DNA"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">{mode === 'dco' ? 'Base Offer / Hook' : 'Brief'}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Mode</label>
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
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
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
              <label className="text-[10px] text-slate-500 font-mono uppercase">Locations (comma-separated)</label>
              <input
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-mono uppercase">Audience Segments (comma-separated)</label>
              <input
                value={audienceSegments}
                onChange={(e) => setAudienceSegments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </>
        )}

        {mode === 'single' && (
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
        )}

        <button
          onClick={generate}
          disabled={generating || !prompt}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating
            ? 'Generating…'
            : mode === 'matrix'
              ? 'Generate 5-Angle Matrix'
              : mode === 'dco'
                ? 'Generate DCO Matrix'
                : 'Generate Copy'}
        </button>
      </div>

      {/* RIGHT: Draft Canvas */}
      {mode === 'matrix' ? (
        angleDrafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {angleDrafts.map((a, i) => (
              <div key={a.angle} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">{a.angle}</span>
                <textarea
                  value={a.content}
                  onChange={(e) => {
                    const next = [...angleDrafts];
                    next[i] = { ...next[i], content: e.target.value };
                    setAngleDrafts(next);
                  }}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
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
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  {savingAngle === a.angle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save to Staged Assets
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 text-sm">
            Set your brief, then generate to see all 5 angles here.
          </div>
        )
      ) : mode === 'dco' ? (
        dcoVariants.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dcoVariants.map((v, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
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
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5"
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {stagingDco ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {stagingDco ? 'Staging…' : `Batch Stage All ${dcoVariants.length} Variants`}
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 text-sm">
            Set your base offer, locations, and audience segments, then generate the personalization matrix here.
          </div>
        )
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex flex-col">
          {draft ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase">{draft.title}</span>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
                />
                <CharLimitBadges text={draft.content} />
                <ScoreBadge
                  content={draft.content}
                  type="COPY"
                  metadata={{ tone }}
                  onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content })}
                />
              </div>
              <div className="pt-4 border-t border-slate-800 mt-auto">
                <button
                  onClick={saveSingle}
                  disabled={savingSingle}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  {savingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingSingle ? 'Saving…' : 'Save to Staged Assets'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm">
              Set your brief and tone, then generate to see the draft here.
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
    </div>
  );
}
