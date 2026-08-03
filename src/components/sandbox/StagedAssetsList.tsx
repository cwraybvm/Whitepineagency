'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Rocket, Loader2, Archive, Send, Download, FileArchive } from 'lucide-react';
import type { CreativeAsset, SandboxTool } from './types';
import ScoreBadge from './ScoreBadge';
import type { ScorableType } from '@/lib/creativeScore';
import type { Platform } from '@/lib/platformExport';

// 'campaign' and 'swipe' are intentionally absent — both produce mixed-type
// output (COPY + AD), so their Staged Assets view shows everything, unfiltered.
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT', 'landing-page': 'LANDING_PAGE' };

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function StagedAssetsList({ activeTool }: { activeTool: SandboxTool }) {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<Platform>('META');
  const [manualTargetUrl, setManualTargetUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const toggleSelected = (assetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const selectedAssets = assets.filter((a) => selectedIds.has(a.id));
  const needsManualUrl = selectedAssets.some((a) => !a.organization);

  const buildDeployBody = (action: 'deploy' | 'export') => {
    const targetUrls: Record<string, string> = {};
    if (manualTargetUrl.trim()) {
      for (const a of selectedAssets) {
        if (!a.organization) targetUrls[a.id] = manualTargetUrl.trim();
      }
    }
    return { action, assetIds: Array.from(selectedIds), platform, targetUrls };
  };

  const deploySelected = async () => {
    if (selectedIds.size === 0) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/sandbox/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDeployBody('deploy')),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      toast.success(`Deployed ${data.payloads.length} asset(s) to ${PLATFORM_LABELS[platform]}`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deploy');
    } finally {
      setDeploying(false);
    }
  };

  const exportSelected = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/sandbox/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDeployBody('export')),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'platform-export.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export');
    } finally {
      setExporting(false);
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
      {selectedIds.size > 0 && (
        <div className="bg-slate-900/80 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
          <div className="flex gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  platform === p ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
          {needsManualUrl && (
            <input
              value={manualTargetUrl}
              onChange={(e) => setManualTargetUrl(e.target.value)}
              placeholder="Target URL for unpromoted assets…"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500 min-w-[220px]"
            />
          )}
          <button
            onClick={deploySelected}
            disabled={deploying}
            className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
          >
            {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Deploy Campaign
          </button>
          <button
            onClick={exportSelected}
            disabled={exporting}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
            Export ZIP
          </button>
        </div>
      )}
      {assets.map((asset) => (
        <div key={asset.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(asset.id)}
                onChange={() => toggleSelected(asset.id)}
                className="w-3.5 h-3.5 accent-indigo-500"
              />
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
              {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
                <span
                  key={p}
                  className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-300 border-violet-500/30"
                >
                  {PLATFORM_LABELS[p]} Ready
                </span>
              ))}
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
