'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Star, Loader2, Sparkles, MessageSquareText } from 'lucide-react';
import type { GbpReviewResponse } from '@/lib/sandboxPrompts';
import CopyButton from '@/components/sandbox/CopyButton';

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_PRIMARY = '#0284C7';

const SENTIMENT_STYLES: Record<GbpReviewResponse['sentiment'], string> = {
  POSITIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  NEUTRAL: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  NEGATIVE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function ReviewResponderPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [location, setLocation] = useState('');
  const [serviceKeyword, setServiceKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GbpReviewResponse | null>(null);

  useEffect(() => {
    fetch('/api/portal/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBranding(data))
      .catch(() => {});
  }, []);

  const primaryColor = branding?.primaryColor || DEFAULT_PRIMARY;
  const canGenerate = reviewText.trim() && starRating > 0 && !generating;

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/portal/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText,
          starRating,
          location: location || undefined,
          serviceKeyword: serviceKeyword || undefined,
          brandName: branding?.name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      const { success, ...rest } = data;
      setResult(rest as GbpReviewResponse);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate review reply');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100"
      style={{ ['--portal-primary' as string]: primaryColor }}
    >
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span
          className="text-xs font-bold uppercase tracking-widest font-mono block flex items-center gap-1.5"
          style={{ color: 'var(--portal-primary)' }}
        >
          <MessageSquareText className="w-3.5 h-3.5" /> REPUTATION MANAGEMENT
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">GBP Review Auto-Responder</h1>
        <p className="text-xs text-slate-400">
          Draft a warm, brand-aligned, SEO-aware reply to any Google Business Profile review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* LEFT: Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Review Details</h2>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Star Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStarRating(n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  className="p-0.5"
                >
                  <Star
                    className="w-6 h-6"
                    style={
                      n <= starRating
                        ? { fill: 'var(--portal-primary)', color: 'var(--portal-primary)' }
                        : undefined
                    }
                    strokeWidth={1.5}
                    color={n <= starRating ? undefined : '#475569'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Customer Review</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              placeholder="Paste the customer's review text here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Round Rock, TX"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Core Service Keyword (optional)</label>
            <input
              value={serviceKeyword}
              onChange={(e) => setServiceKeyword(e.target.value)}
              placeholder="e.g. AC repair"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full py-2.5 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: 'var(--portal-primary)' }}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate Reply'}
          </button>
        </div>

        {/* RIGHT: Result */}
        <div>
          {!result ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-400 text-sm">
              Enter a review and star rating, then Generate Reply to see the draft here.
            </div>
          ) : (
            <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <CopyButton text={result.replyText} />

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${SENTIMENT_STYLES[result.sentiment]}`}>
                  {result.sentiment}
                </span>
                {result.seoKeywordsIncluded.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-slate-800/60 text-slate-300 border-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>

              <p className="text-sm text-slate-100 whitespace-pre-wrap">{result.replyText}</p>

              <div className="pt-3 border-t border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Recommended Action</span>
                <p className="text-xs text-slate-300">{result.recommendedAction}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
