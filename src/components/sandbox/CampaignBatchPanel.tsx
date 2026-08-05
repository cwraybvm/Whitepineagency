'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Loader2, Rocket, Clapperboard, MessageSquareText, RefreshCw } from 'lucide-react';
import type { CampaignBatch, OrgBrand } from './types';
import { ASPECT_RATIOS } from './types';
import ScoreBadge from './ScoreBadge';
import AdMockupCard from './AdMockupCard';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';

const FALLBACK_BRAND_COLOR = '#059669';

export default function CampaignBatchPanel() {
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('Fill 10 spring AC tune-up slots this month');
  const [targetAudience, setTargetAudience] = useState('Homeowners with AC units older than 8 years');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [staging, setStaging] = useState(false);
  const [batch, setBatch] = useState<CampaignBatch | null>(null);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    setBatch(null);
    try {
      const data = await fetchGenerationJson('/api/sandbox/campaign-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organizationId || undefined, campaignGoal, targetAudience }),
      });
      setBatch(data);
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };

  const optimizeAngle = (i: number, content: string, title?: string) => {
    if (!batch) return;
    const angles = [...batch.angles];
    angles[i] = { ...angles[i], title: title || angles[i].title, content };
    setBatch({ ...batch, angles });
  };

  const optimizeAd = (content: string, title?: string, metadata?: any) => {
    if (!batch) return;
    setBatch({ ...batch, ad: { title: title || batch.ad.title, content, metadata: metadata || batch.ad.metadata } });
  };

  const optimizeVideo = (content: string, title?: string, metadata?: any) => {
    if (!batch) return;
    setBatch({ ...batch, video: { title: title || batch.video.title, content, metadata: metadata || batch.video.metadata } });
  };

  const optimizeDrip = (content: string, title?: string, metadata?: any) => {
    if (!batch) return;
    setBatch({ ...batch, drip: { title: title || batch.drip.title, content, metadata: metadata || batch.drip.metadata } });
  };

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const brandColor = selectedOrg?.primaryColor || FALLBACK_BRAND_COLOR;

  const stage = async () => {
    if (!batch) return;
    setStaging(true);
    try {
      const saveAsset = (title: string, type: string, content: string, metadata: any) =>
        fetch('/api/sandbox/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, type, content, metadata }),
        });

      const calls = [
        ...batch.angles.map((a) => saveAsset(a.title, 'COPY', a.content, { angle: a.angle, campaignGoal })),
        ...ASPECT_RATIOS.map((r) =>
          saveAsset(batch.ad.title, 'AD', batch.ad.content, { ...batch.ad.metadata, aspectRatio: r.id, campaignGoal })
        ),
        saveAsset(batch.video.title, 'VIDEO_SCRIPT', batch.video.content, { ...batch.video.metadata, campaignGoal }),
        saveAsset(batch.drip.title, 'DRIP', batch.drip.content, { ...batch.drip.metadata, campaignGoal }),
      ];

      const results = await Promise.all(calls);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) throw new Error(`${failed} of ${results.length} assets failed to save`);

      toast.success(`Staged ${results.length} assets for this campaign`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to stage campaign');
    } finally {
      setStaging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Campaign Batch Engine</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client</label>
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
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Campaign Goal</label>
            <input
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Target Audience</label>
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
            />
          </div>
        </div>
        <button
          onClick={generate}
          disabled={generating || !campaignGoal}
          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating full campaign…' : 'Generate Full Campaign'}
        </button>
      </div>

      {generationFailed && !batch && (
        <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
          <button
            onClick={generate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {batch && (
        <div className="space-y-6">
          {/* 5-angle matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">5 Copy Angles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {batch.angles.map((a, i) => (
                <div key={a.angle} className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">{a.angle}</span>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{a.content}</p>
                  <ScoreBadge
                    content={a.content}
                    type="COPY"
                    metadata={{ angle: a.angle }}
                    onOptimized={(r) => optimizeAngle(i, r.content, r.title)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ad (3 ratios) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Creative (stages as 3 canvas ratios)</h3>
            <div className="flex flex-wrap gap-4">
              {ASPECT_RATIOS.map((r) => (
                <AdMockupCard
                  key={r.id}
                  aspectRatio={r.id}
                  brandColor={brandColor}
                  logoUrl={selectedOrg?.logoUrl}
                  orgName={selectedOrg?.name}
                  platform="Meta"
                  headline={batch.ad.metadata.headline}
                  content={batch.ad.content}
                  cta={batch.ad.metadata.cta}
                />
              ))}
            </div>
            <ScoreBadge
              content={batch.ad.content}
              type="AD"
              metadata={batch.ad.metadata}
              onOptimized={(r) => optimizeAd(r.content, r.title, r.metadata)}
            />
          </div>

          {/* Video script */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Video Script</h3>
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-3">
              {batch.video.metadata.beats.map((beat, i) => (
                <div key={i} className="flex gap-3">
                  <Clapperboard className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{beat.scene}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{beat.shot}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{beat.line}</p>
                  </div>
                </div>
              ))}
              <ScoreBadge
                content={batch.video.content}
                type="VIDEO_SCRIPT"
                metadata={batch.video.metadata}
                onOptimized={(r) => optimizeVideo(r.content, r.title, r.metadata)}
              />
            </div>
          </div>

          {/* Drip */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">3-Step Follow-Up Drip</h3>
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 space-y-3">
              {batch.drip.metadata.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <MessageSquareText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{step.day} — {step.channel}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{step.content}</p>
                  </div>
                </div>
              ))}
              <ScoreBadge
                content={batch.drip.content}
                type="DRIP"
                metadata={batch.drip.metadata}
                onOptimized={(r) => optimizeDrip(r.content, r.title, r.metadata)}
              />
            </div>
          </div>

          <button
            onClick={stage}
            disabled={staging}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            {staging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {staging ? 'Staging campaign…' : 'Batch Stage Campaign'}
          </button>
        </div>
      )}
    </div>
  );
}
