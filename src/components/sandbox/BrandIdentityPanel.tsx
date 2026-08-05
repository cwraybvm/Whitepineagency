'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Loader2, Sparkles, Download, ChevronDown, FileJson, FileText, Wand2, ArrowRightCircle, ExternalLink, ImagePlus } from 'lucide-react';
import type { ExtractedBrandIdentity, BrandDna } from '@/lib/sandboxPrompts';
import { toBrandDna } from '@/lib/brandDna';
import { buildSwipeFileMarkdown } from '@/lib/swipeFileExport';
import CopyButton from './CopyButton';
import type { SandboxTool } from './types';

const INSERT_TARGETS: { id: SandboxTool; label: string }[] = [
  { id: 'copy', label: 'Copy Studio' },
  { id: 'ad', label: 'Ad Builder' },
  { id: 'video', label: 'Video Lab' },
  { id: 'campaign', label: 'Campaign Engine' },
];

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return (value || 'brand').replace(/\s+/g, '-').toLowerCase();
}

function domainFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function adLibraryLinks(domain: string): { label: string; href: string }[] {
  return [
    { label: 'Meta Ad Library', href: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&q=${encodeURIComponent(domain)}` },
    { label: 'Google Ads Transparency', href: `https://adstransparency.google.com/?region=anywhere&q=${encodeURIComponent(domain)}` },
    { label: 'TikTok Creative Center', href: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=30&region=US' },
  ];
}

export default function BrandIdentityPanel({
  onApplyBrandDna,
  onInsertPhrase,
}: {
  onApplyBrandDna: (dna: BrandDna) => void;
  onInsertPhrase: (tool: SandboxTool, text: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [mining, setMining] = useState(false);
  const [identity, setIdentity] = useState<ExtractedBrandIdentity | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [insertOpenIndex, setInsertOpenIndex] = useState<number | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState<string | null>(null);
  const [imagePrompts, setImagePrompts] = useState<Record<string, string>>({});

  const mine = async () => {
    if (!url.trim()) return;
    setIdentity(null);
    setImagePrompts({});
    setExportOpen(false);
    setInsertOpenIndex(null);
    setMining(true);
    try {
      const res = await fetch('/api/sandbox/brand-identity', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || 'Brand identity extraction failed');
      }
      const { success, ...rest } = data;
      setIdentity(rest as ExtractedBrandIdentity);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mine brand DNA');
    } finally {
      setMining(false);
    }
  };

  const copyColor = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`Copied ${hex}`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const exportMarkdown = () => {
    if (!identity) return;
    downloadTextFile(`${slugify(identity.brandName)}-swipe-file.md`, buildSwipeFileMarkdown(identity, url), 'text/markdown');
    setExportOpen(false);
  };

  const exportJson = () => {
    if (!identity) return;
    downloadTextFile(`${slugify(identity.brandName)}-brand-dna.json`, JSON.stringify(identity, null, 2), 'application/json');
    setExportOpen(false);
  };

  const analyzeImage = async (imgUrl: string) => {
    setAnalyzingImage(imgUrl);
    try {
      const res = await fetch('/api/sandbox/image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imgUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prompt generation failed');
      setImagePrompts((prev) => ({ ...prev, [imgUrl]: data.prompt }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze image');
    } finally {
      setAnalyzingImage(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Fingerprint className="w-3.5 h-3.5" /> Brand Identity Miner
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client Website URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://clientwebsite.com"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          />
        </div>

        <button
          onClick={mine}
          disabled={mining || !url.trim()}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {mining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {mining ? 'Mining…' : 'Mine Brand DNA'}
        </button>

        {identity && (
          <div
            tabIndex={-1}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setExportOpen(false);
            }}
            className="relative pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Swipe File <ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-10">
                <button
                  onClick={exportMarkdown}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                >
                  <FileText className="w-3.5 h-3.5" /> Download Markdown (.md)
                </button>
                <button
                  onClick={exportJson}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                >
                  <FileJson className="w-3.5 h-3.5" /> Download JSON (.json)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Results */}
      <div className="space-y-6">
        {!identity ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Paste a client website URL and Mine Brand DNA to see the breakdown here.
          </div>
        ) : (
          <>
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-2 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{identity.brandName || 'Untitled Brand'}</h3>
                {identity.brandVoice && (
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    {identity.brandVoice}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  onApplyBrandDna(toBrandDna(identity));
                  toast.success('Applied as active Brand DNA across the sandbox');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" /> Apply as Active Brand DNA
              </button>
            </div>

            {identity.colors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Brand Palette</h3>
                <div className="flex flex-wrap gap-2">
                  {identity.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => copyColor(color)}
                      title={`Copy ${color}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-[#121824]/75 text-[10px] font-mono text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 transition-colors"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shrink-0" style={{ backgroundColor: color }} />
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {identity.brandImages.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Visuals</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {identity.brandImages.map((imgUrl) => (
                    <div key={imgUrl} className="group relative aspect-square rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <button
                        onClick={() => window.open(imgUrl, '_blank', 'noopener,noreferrer')}
                        className="w-full h-full"
                        title={imgUrl}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                      <button
                        onClick={() => analyzeImage(imgUrl)}
                        disabled={analyzingImage === imgUrl}
                        title="Analyze Midjourney Prompt"
                        className="absolute inset-x-1 bottom-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[9px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                      >
                        {analyzingImage === imgUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                        Analyze
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(imagePrompts).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Midjourney Prompts</h3>
                <div className="space-y-2">
                  {Object.entries(imagePrompts).map(([imgUrl, prompt]) => (
                    <div key={imgUrl} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3 pr-16">
                      <p className="text-sm text-slate-700 dark:text-slate-200">{prompt}</p>
                      <CopyButton text={prompt} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {identity.keyVerbalTracks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Key Verbal Tracks</h3>
                <div className="space-y-2">
                  {identity.keyVerbalTracks.map((track, i) => (
                    <div
                      key={i}
                      className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3 pr-16 pb-10"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-200 italic">&ldquo;{track}&rdquo;</p>
                      <CopyButton text={track} />
                      <div
                        tabIndex={-1}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) setInsertOpenIndex(null);
                        }}
                        className="absolute bottom-2 right-2"
                      >
                        <button
                          onClick={() => setInsertOpenIndex(insertOpenIndex === i ? null : i)}
                          title="Insert into a generation tool's brief"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border bg-white/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                        >
                          <ArrowRightCircle className="w-3 h-3" /> Insert
                        </button>
                        {insertOpenIndex === i && (
                          <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-10 min-w-[160px]">
                            {INSERT_TARGETS.map((target) => (
                              <button
                                key={target.id}
                                onClick={() => {
                                  onInsertPhrase(target.id, track);
                                  setInsertOpenIndex(null);
                                  toast.success(`Inserted into ${target.label}`);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left whitespace-nowrap"
                              >
                                {target.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {domainFromUrl(url) && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Active Ad Libraries &amp; Spy Links</h3>
                <div className="flex flex-wrap gap-2">
                  {adLibraryLinks(domainFromUrl(url)).map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-[#121824]/75 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Strategy Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Active Ad Angles', value: identity.activeAdAngles },
                  { label: 'Core Value Props', value: identity.coreValueProps },
                  { label: 'Target Audience Profile', value: identity.targetAudienceProfile },
                ].map((f) => (
                  <div key={f.label} className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">{f.label}</span>
                    {Array.isArray(f.value) ? (
                      <ul className="space-y-1">
                        {f.value.length > 0 ? (
                          f.value.map((v, i) => (
                            <li key={i} className="text-sm text-slate-700 dark:text-slate-200">{v}</li>
                          ))
                        ) : (
                          <li className="text-sm text-slate-400 dark:text-slate-600">(none)</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-200">{f.value || '(none)'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
