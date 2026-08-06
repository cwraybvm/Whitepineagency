'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Sparkles, Plus, X, RefreshCw } from 'lucide-react';
import { BlogPostToneOptions, type OrgBrand, type BlogPostTone } from './types';
import type { BrandDna, BlogPostPackage, MediaAsset } from '@/lib/sandboxPrompts';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';

type InputMode = 'notes' | 'draft';

const emptyMedia = (): MediaAsset => ({ type: 'image', url: '', caption: '', altText: '' });

export default function BlogPostStudioPanel({ activeBrandDna }: { activeBrandDna?: BrandDna | null } = {}) {
  const [mode, setMode] = useState<InputMode>('notes');
  const [text, setText] = useState('');
  const [tone, setTone] = useState<BlogPostTone>('informative');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [pkg, setPkg] = useState<BlogPostPackage | null>(null);
  const [placementAssignments, setPlacementAssignments] = useState<Record<string, number | null>>({});
  const [refiningField, setRefiningField] = useState<string | null>(null);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);

  const updateMedia = (index: number, patch: Partial<MediaAsset>) => {
    setMedia((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const addMedia = () => setMedia((prev) => [...prev, emptyMedia()]);

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
    setPlacementAssignments((prev) => {
      const next: Record<string, number | null> = {};
      for (const [tag, assigned] of Object.entries(prev)) {
        if (assigned === index) next[tag] = null;
        else if (assigned != null && assigned > index) next[tag] = assigned - 1;
        else next[tag] = assigned;
      }
      return next;
    });
  };

  const canGenerate = text.trim().length > 0 && !generating;

  const generate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          [mode === 'notes' ? 'notes' : 'draftCopy']: text,
          tone,
          media,
          activeBrandDna: activeBrandDna || undefined,
        }),
      });
      const { success, ...rest } = data;
      setPkg(rest as BlogPostPackage);
      setPlacementAssignments({});
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate blog post');
    } finally {
      setGenerating(false);
    }
  };

  const updateField = (patch: Partial<BlogPostPackage>) => {
    setPkg((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateKeyword = (index: number, value: string) => {
    setPkg((prev) => {
      if (!prev) return prev;
      const targetKeywords = [...prev.targetKeywords];
      targetKeywords[index] = value;
      return { ...prev, targetKeywords };
    });
  };

  const addKeyword = () => setPkg((prev) => (prev ? { ...prev, targetKeywords: [...prev.targetKeywords, ''] } : prev));

  const removeKeyword = (index: number) => {
    setPkg((prev) => (prev ? { ...prev, targetKeywords: prev.targetKeywords.filter((_, i) => i !== index) } : prev));
  };

  const refineSection = async (field: 'title' | 'metaDescription' | 'excerpt', instruction: string) => {
    if (!pkg) return;
    setRefiningField(field);
    try {
      const data = await fetchGenerationJson('/api/sandbox/landing-page/refine-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, currentValue: pkg[field], instruction, organizationId: organizationId || undefined }),
      });
      updateField({ [field]: data.text } as Partial<BlogPostPackage>);
      toast.success('Section updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refine section');
    } finally {
      setRefiningField(null);
    }
  };

  const assignPlacement = (tag: string, mediaIndex: number | null) => {
    setPlacementAssignments((prev) => ({ ...prev, [tag]: mediaIndex }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6 items-start">
      {/* LEFT: Controls & Inspector */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Blog Post Studio
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('notes')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'notes' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Notes
            </button>
            <button
              onClick={() => setMode('draft')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'draft' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Draft Copy
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">
            {mode === 'notes' ? 'Raw Notes' : 'Draft Copy'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={
              mode === 'notes'
                ? 'e.g. Kitchen remodel in Denver, 6-week timeline, handled a mid-project material shortage smoothly...'
                : "Paste your existing draft here — I'll restructure, polish, and SEO-optimize it without changing your claims."
            }
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Tone</label>
          <div className="flex flex-wrap gap-2">
            {BlogPostToneOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  tone === t
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Reference Media (optional)</label>
          <div className="space-y-2">
            {media.map((m, i) => (
              <div key={i} className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex gap-1.5">
                  <select
                    value={m.type}
                    onChange={(e) => updateMedia(i, { type: e.target.value as MediaAsset['type'] })}
                    className="bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input
                    value={m.url}
                    onChange={(e) => updateMedia(i, { url: e.target.value })}
                    placeholder="https://... media URL"
                    className="flex-1 bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                  />
                  <button onClick={() => removeMedia(i)} className="px-2 rounded-lg text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={m.caption}
                  onChange={(e) => updateMedia(i, { caption: e.target.value })}
                  placeholder="Caption (shown under the image/video)"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                />
                <input
                  value={m.altText}
                  onChange={(e) => updateMedia(i, { altText: e.target.value })}
                  placeholder="Alt text (accessibility/SEO)"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addMedia}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Media
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client (for Brand DNA &amp; preview color)</label>
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
          disabled={!canGenerate}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Blog Post'}
        </button>

        {pkg && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Title</label>
                <button
                  onClick={() => refineSection('title', 'Rewrite this title to be more compelling and keyword-aware, keep it 50-60 characters')}
                  disabled={refiningField === 'title'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'title' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <input
                value={pkg.title}
                onChange={(e) => updateField({ title: e.target.value })}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
              <p className="text-[9px] text-slate-400">{pkg.title.length} chars (aim for 50-60)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Slug</label>
              <input
                value={pkg.slug}
                onChange={(e) => updateField({ slug: e.target.value })}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Meta Description</label>
                <button
                  onClick={() => refineSection('metaDescription', 'Rewrite this meta description to be 120-160 characters and include the primary keyword naturally')}
                  disabled={refiningField === 'metaDescription'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'metaDescription' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <textarea
                value={pkg.metaDescription}
                onChange={(e) => updateField({ metaDescription: e.target.value })}
                rows={2}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
              <p className="text-[9px] text-slate-400">{pkg.metaDescription.length} chars (aim for 120-160)</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Excerpt</label>
                <button
                  onClick={() => refineSection('excerpt', 'Rewrite this excerpt to hook a reader in one or two sentences')}
                  disabled={refiningField === 'excerpt'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'excerpt' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <textarea
                value={pkg.excerpt}
                onChange={(e) => updateField({ excerpt: e.target.value })}
                rows={2}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Target Keywords</label>
              {pkg.targetKeywords.map((kw, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={kw}
                    onChange={(e) => updateKeyword(i, e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                  <button onClick={() => removeKeyword(i)} className="px-2 rounded-lg text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addKeyword}
                className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Keyword
              </button>
            </div>

            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
              {pkg.readTimeMinutes} min read
            </span>

            {pkg.suggestedMediaPlacements.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Media Placements</label>
                {pkg.suggestedMediaPlacements.map((placement) => (
                  <div key={placement.placementTag} className="space-y-1 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{placement.contextNote}</p>
                    <select
                      value={placementAssignments[placement.placementTag] ?? ''}
                      onChange={(e) => assignPlacement(placement.placementTag, e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                    >
                      <option value="">(none)</option>
                      {media.map((m, i) => (
                        <option key={i} value={i}>{m.caption || `${m.type} ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Task 10 inserts ScoreBadge + Save to Staged Assets here */}
        {/* Task 12 inserts the export row here */}
      </div>

      {/* RIGHT: Live Preview — Task 11 fills this in */}
      <div className="space-y-3">
        {!pkg && (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[500px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
                <button
                  onClick={generate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : (
              'Add notes or a draft and Generate Blog Post to see the live preview here.'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
