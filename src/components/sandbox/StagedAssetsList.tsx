'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Rocket, Loader2, Archive } from 'lucide-react';
import type { CreativeAsset, SandboxTool } from './types';
import ScoreBadge from './ScoreBadge';
import type { ScorableType } from '@/lib/creativeScore';

// 'campaign' and 'swipe' are intentionally absent — both produce mixed-type
// output (COPY + AD), so their Staged Assets view shows everything, unfiltered.
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT', 'landing-page': 'LANDING_PAGE' };

export default function StagedAssetsList({ activeTool }: { activeTool: SandboxTool }) {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const type = TOOL_TYPE[activeTool];
      const [assetsRes, orgsRes] = await Promise.all([
        fetch(type ? `/api/sandbox/assets?type=${type}` : '/api/sandbox/assets'),
        fetch('/api/sandbox/organizations'),
      ]);
      setAssets(await assetsRes.json());
      setOrgs(await orgsRes.json());
    } catch {
      toast.error('Failed to load staged assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  const promote = async (assetId: string) => {
    const organizationId = selectedOrg[assetId];
    if (!organizationId) {
      toast.error('Pick a client organization first');
      return;
    }
    setPromotingId(assetId);
    try {
      const res = await fetch(`/api/sandbox/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Promote failed');
      toast.success('Promoted to Production');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote asset');
    } finally {
      setPromotingId(null);
    }
  };

  const optimizeAsset = async (assetId: string, content: string, title: string | undefined, metadata: any) => {
    try {
      const res = await fetch(`/api/sandbox/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, metadata, ...(title ? { title } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save optimized content');
      setAssets((prev) => prev.map((a) => (a.id === assetId ? data.asset : a)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save optimized content');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 flex items-center justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
        <Archive className="w-6 h-6" />
        No staged assets yet for this tool. Generate and save one from Draft Canvas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <div key={asset.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  asset.status === 'PRODUCTION'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
              >
                {asset.status}
              </span>
              <span className="text-sm font-bold text-white truncate">{asset.title}</span>
              {asset.organization && (
                <span className="text-[11px] text-slate-500">→ {asset.organization.name}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 whitespace-pre-wrap">{asset.content}</p>
            <ScoreBadge
              content={asset.content}
              type={asset.type as ScorableType}
              metadata={asset.metadata}
              onOptimized={(r) => optimizeAsset(asset.id, r.content, r.title, r.metadata || asset.metadata)}
            />
          </div>

          {asset.status === 'STAGED' && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedOrg[asset.id] || ''}
                onChange={(e) => setSelectedOrg((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Select client…</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <button
                onClick={() => promote(asset.id)}
                disabled={promotingId === asset.id}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 shrink-0"
              >
                {promotingId === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                Promote to Production
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
