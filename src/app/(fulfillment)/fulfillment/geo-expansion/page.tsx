'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MapPinned, Loader2, Sparkles, FileSpreadsheet, ClipboardCopy } from 'lucide-react';
import type { GeoExpansionPackage } from '@/lib/sandboxPrompts';
import CopyButton from '@/components/sandbox/CopyButton';

type LocalizedAdVariation = GeoExpansionPackage['variations'][number];

function LimitBadge({ text, limit }: { text: string; limit: number }) {
  const over = text.length > limit;
  return (
    <span
      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
        over
          ? 'bg-red-500/15 text-red-300 border-red-500/40'
          : 'bg-slate-800/60 text-slate-400 border-slate-700'
      }`}
    >
      {text.length}/{limit}
    </span>
  );
}

function buildCsv(variations: LocalizedAdVariation[]): string {
  const header = 'Location,Headline 1,Headline 2,Headline 3,Description 1,Description 2';
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  const rows = variations.map((v) =>
    [v.location, ...v.googleHeadlines, ...v.googleDescriptions].map(escape).join(','),
  );
  return [header, ...rows].join('\n');
}

function buildPlainText(variations: LocalizedAdVariation[]): string {
  return variations
    .map((v) =>
      [
        `# ${v.location}`,
        'Google RSA Headlines:',
        ...v.googleHeadlines.map((h) => `- ${h}`),
        'Google RSA Descriptions:',
        ...v.googleDescriptions.map((d) => `- ${d}`),
        'Meta Hooks:',
        ...v.metaHooks.map((h) => `- ${h}`),
        `Landing Page H1: ${v.landingPageH1}`,
      ].join('\n'),
    )
    .join('\n\n');
}

export default function GeoExpansionPage() {
  const [coreService, setCoreService] = useState('');
  const [offer, setOffer] = useState('');
  const [locationsText, setLocationsText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<LocalizedAdVariation[]>([]);

  const locations = locationsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const canGenerate = coreService.trim() && offer.trim() && locations.length > 0 && !generating;

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/fulfillment/geo-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreService, offer, locations }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      setVariations(data.variations);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate geo-expansion package');
    } finally {
      setGenerating(false);
    }
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(buildCsv(variations));
      toast.success('CSV copied to clipboard');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(variations));
      toast.success('Copied full bundle to clipboard');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <MapPinned className="w-3.5 h-3.5" /> FULFILLMENT
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Localized Geo-Expansion Generator</h1>
        <p className="text-xs text-slate-400">
          Turn one offer into ready-to-run localized ad copy for every sub-market you serve.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* LEFT: Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Expansion Controls</h2>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Core Service</label>
            <input
              value={coreService}
              onChange={(e) => setCoreService(e.target.value)}
              placeholder="e.g. AC Tune-Up"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Offer Details</label>
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              rows={3}
              placeholder="e.g. $79 Spring AC Tune-Up Special"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Target Locations (one per line)</label>
            <textarea
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              rows={5}
              placeholder={'Austin, TX\nRound Rock, TX\nCedar Park, TX'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate Geo-Expansion'}
          </button>

          {variations.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={copyCsv}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Copy CSV for Google Ads
              </button>
              <button
                onClick={copyAll}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <ClipboardCopy className="w-3.5 h-3.5" /> Copy All to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {variations.length === 0 ? (
            <div className="sm:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-400 text-sm">
              Enter a service, offer, and locations, then Generate Geo-Expansion to see localized copy here.
            </div>
          ) : (
            variations.map((v, i) => (
              <div key={i} className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 pr-16 space-y-3">
                <CopyButton
                  text={[
                    `# ${v.location}`,
                    ...v.googleHeadlines,
                    ...v.googleDescriptions,
                    ...v.metaHooks,
                    v.landingPageH1,
                  ].join('\n')}
                />
                <h3 className="text-sm font-black text-white">{v.location}</h3>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Google RSA Headlines</span>
                  {v.googleHeadlines.map((h, hi) => (
                    <div key={hi} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                      <span>{h}</span>
                      <LimitBadge text={h} limit={30} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Google RSA Descriptions</span>
                  {v.googleDescriptions.map((d, di) => (
                    <div key={di} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                      <span>{d}</span>
                      <LimitBadge text={d} limit={90} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Meta Hooks</span>
                  {v.metaHooks.map((h, hi) => (
                    <p key={hi} className="text-xs text-slate-200">{h}</p>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Landing Page H1</span>
                  <p className="text-xs text-slate-200">{v.landingPageH1}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
