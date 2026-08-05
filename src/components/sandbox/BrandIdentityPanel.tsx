'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Loader2, Sparkles, Download, ChevronDown, FileJson, FileText } from 'lucide-react';
import type { ExtractedBrandIdentity } from '@/lib/sandboxPrompts';
import { buildSwipeFileMarkdown } from '@/lib/swipeFileExport';
import CopyButton from './CopyButton';

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

export default function BrandIdentityPanel() {
  const [url, setUrl] = useState('');
  const [mining, setMining] = useState(false);
  const [identity, setIdentity] = useState<ExtractedBrandIdentity | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const mine = async () => {
    if (!url.trim()) return;
    setMining(true);
    try {
      const res = await fetch('/api/sandbox/brand-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Brand identity extraction failed');
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
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{identity.brandName || 'Untitled Brand'}</h3>
              {identity.brandVoice && (
                <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  {identity.brandVoice}
                </span>
              )}
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
                    <button
                      key={imgUrl}
                      onClick={() => window.open(imgUrl, '_blank', 'noopener,noreferrer')}
                      className="aspect-square rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900"
                      title={imgUrl}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
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
                      className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3 pr-16"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-200 italic">&ldquo;{track}&rdquo;</p>
                      <CopyButton text={track} />
                    </div>
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
