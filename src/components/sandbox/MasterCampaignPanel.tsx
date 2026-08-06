'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Loader2, Sparkles, Download, ChevronDown, FileJson, FileText, FileCode, Send } from 'lucide-react';
import type { BrandDna, MasterCampaignPackage } from '@/lib/sandboxPrompts';
import type { SandboxTool } from './types';
import { buildMasterCampaignMarkdown, buildMasterCampaignHtml } from '@/lib/masterCampaignExport';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';
import CopyButton from './CopyButton';

const CHANNELS = [
  { id: 'meta', label: 'Meta Ads' },
  { id: 'google-search', label: 'Google Search' },
  { id: 'google-business', label: 'Google Business' },
  { id: 'video', label: 'Video Scripts' },
  { id: 'email-sms', label: 'Email & SMS' },
] as const;
type ChannelId = (typeof CHANNELS)[number]['id'];

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
  return (value || 'campaign').replace(/\s+/g, '-').toLowerCase();
}

export default function MasterCampaignPanel({
  activeBrandDna,
  onInsertPhrase,
}: {
  activeBrandDna?: BrandDna | null;
  onInsertPhrase?: (tool: SandboxTool, text: string) => void;
} = {}) {
  const [location, setLocation] = useState('');
  const [promoOffer, setPromoOffer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pkg, setPkg] = useState<MasterCampaignPackage | null>(null);
  const [channel, setChannel] = useState<ChannelId>('meta');
  const [exportOpen, setExportOpen] = useState(false);

  const generate = async () => {
    if (!location.trim() || !promoOffer.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/master-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, promoOffer, activeBrandDna: activeBrandDna || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Campaign generation failed');
      const { success, ...rest } = data;
      setPkg(rest as MasterCampaignPackage);
      setChannel('meta');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };

  const exportHtml = () => {
    if (!pkg) return;
    downloadTextFile(`${slugify(location)}-30-day-campaign.html`, buildMasterCampaignHtml(pkg, location, promoOffer, activeBrandDna?.brandName), 'text/html');
    setExportOpen(false);
  };

  const exportMarkdown = () => {
    if (!pkg) return;
    downloadTextFile(`${slugify(location)}-30-day-campaign.md`, buildMasterCampaignMarkdown(pkg, location, promoOffer), 'text/markdown');
    setExportOpen(false);
  };

  const exportJson = () => {
    if (!pkg) return;
    downloadTextFile(`${slugify(location)}-30-day-campaign.json`, JSON.stringify(pkg, null, 2), 'application/json');
    setExportOpen(false);
  };

  const sendToBlogStudio = () => {
    if (!pkg) return;
    const text = [promoOffer, '', `Location: ${location}`, '', pkg.googleBusinessPosts[0]?.content || ''].join('\n');
    onInsertPhrase?.('blog-post', text);
    toast.success('Sent to Blog Studio');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> 30-Day Campaign Orchestrator
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Denver, CO"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Promo Offer</label>
          <textarea
            value={promoOffer}
            onChange={(e) => setPromoOffer(e.target.value)}
            rows={3}
            placeholder="e.g. $79 Spring AC Tune-Up"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <button
          onClick={generate}
          disabled={generating || !location.trim() || !promoOffer.trim()}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate 30-Day Campaign'}
        </button>

        {pkg && (
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
              <Download className="w-3.5 h-3.5" /> Export Campaign Package <ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-10">
                <button onClick={exportHtml} className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                  <FileCode className="w-3.5 h-3.5" /> Download HTML Portal (.html)
                </button>
                <button onClick={exportMarkdown} className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                  <FileText className="w-3.5 h-3.5" /> Download Markdown (.md)
                </button>
                <button onClick={exportJson} className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                  <FileJson className="w-3.5 h-3.5" /> Download JSON (.json)
                </button>
              </div>
            )}
          </div>
        )}

        {pkg && (
          <button
            onClick={sendToBlogStudio}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send to Blog Studio
          </button>
        )}
      </div>

      {/* RIGHT: Results */}
      <div className="space-y-4">
        {!pkg ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Enter a location and promo offer, then Generate 30-Day Campaign to see the bundle here.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    channel === c.id
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {channel === 'meta' &&
                pkg.metaAds.map((ad, i) => (
                  <div key={i} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{ad.metadata?.headline || ad.title}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ad.content}</p>
                    {ad.metadata?.cta && <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{ad.metadata.cta}</span>}
                    <CopyButton text={`${ad.metadata?.headline || ad.title}\n${ad.content}\n${ad.metadata?.cta || ''}`} />
                  </div>
                ))}

              {channel === 'google-search' &&
                pkg.googleSearchAds.map((ad, i) => (
                  <div key={i} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{ad.headline}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{ad.description}</p>
                    <CopyButton text={`${ad.headline}\n${ad.description}`} />
                  </div>
                ))}

              {channel === 'google-business' &&
                pkg.googleBusinessPosts.map((post, i) => (
                  <div key={i} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{post.title}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{post.content}</p>
                    <CopyButton text={`${post.title}\n${post.content}`} />
                  </div>
                ))}

              {channel === 'video' &&
                pkg.videoScripts.map((video, i) => (
                  <div key={i} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{video.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{(video.metadata?.beats || []).length} beats</p>
                    <ul className="space-y-1">
                      {(video.metadata?.beats || []).map((beat, bi) => (
                        <li key={bi} className="text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-bold">{beat.shot}</span> — &ldquo;{beat.line}&rdquo;
                        </li>
                      ))}
                    </ul>
                    <CopyButton text={`${video.title}\n${(video.metadata?.beats || []).map((b) => `${b.shot} — "${b.line}"`).join('\n')}`} />
                  </div>
                ))}

              {channel === 'email-sms' &&
                pkg.emailSmsBlasts.map((blast, i) => (
                  <div key={i} className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{blast.day} · {blast.channel}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{blast.content}</p>
                    <CopyButton text={blast.content} />
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
