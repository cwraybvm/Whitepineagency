'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';
import type { CreativeAsset, SandboxTool } from './types';
import type { Platform } from '@/lib/platformExport';
import AssetsSidebar, { type StatusFilter, type TypeFilter } from './AssetsSidebar';
import BulkActionBar from './BulkActionBar';
import AssetListRow from './AssetListRow';
import AssetCard from './AssetCard';
import SkeletonLoader from './SkeletonLoader';

// 'campaign' and 'swipe' are intentionally absent — both produce mixed-type
// output (COPY + AD), so their Staged Assets view shows everything, unfiltered.
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT', 'landing-page': 'LANDING_PAGE' };

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const type = TOOL_TYPE[activeTool];
      const [assetsRes, orgsRes] = await Promise.all([
        fetch(type ? `/api/sandbox/assets?type=${type}` : '/api/sandbox/assets'),
        fetch('/api/sandbox/organizations'),
      ]);

      // Both routes return an error object (not an array) on a non-2xx
      // response — trusting the body shape without checking .ok let a
      // transient 500 turn into `assets`/`orgs` being a plain object,
      // which crashed every .filter()/.map() below with an uncaught
      // TypeError (the actual cause of the "This page couldn't load"
      // client error boundary).
      const assetsJson = assetsRes.ok ? await assetsRes.json() : null;
      const orgsJson = orgsRes.ok ? await orgsRes.json() : null;

      setAssets(Array.isArray(assetsJson) ? assetsJson : []);
      setOrgs(Array.isArray(orgsJson) ? orgsJson : []);

      if (!assetsRes.ok || !orgsRes.ok) {
        toast.error('Failed to load staged assets');
      }
    } catch {
      setAssets([]);
      setOrgs([]);
      toast.error('Failed to load staged assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelectedIds(new Set());
    setManualTargetUrl('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
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

  const buildDeployBody = (action: 'deploy' | 'export') => {
    const targetUrls: Record<string, string> = {};
    if (manualTargetUrl.trim()) {
      for (const a of selectedAssets) {
        targetUrls[a.id] = manualTargetUrl.trim();
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
      toast.success(`Deployed ${data.payloads.length} asset(s) to ${platform}`);
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

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      return true;
    });
  }, [assets, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonLoader variant={viewMode === 'grid' ? 'card' : 'row'} count={viewMode === 'grid' ? 6 : 3} />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-10 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
        <Archive className="w-6 h-6" />
        No staged assets yet for this tool. Generate and save one from Draft Canvas.
      </div>
    );
  }

  const rowProps = (asset: CreativeAsset) => ({
    asset,
    selected: selectedIds.has(asset.id),
    onToggleSelected: toggleSelected,
    orgs,
    selectedOrgId: selectedOrg[asset.id],
    onSelectOrg: (id: string) => setSelectedOrg((prev) => ({ ...prev, [asset.id]: id })),
    onPromote: () => promote(asset.id),
    promoting: promotingId === asset.id,
    onOptimized: (r: { title?: string; content: string; metadata?: any }) =>
      optimizeAsset(asset.id, r.content, r.title, r.metadata || asset.metadata),
  });

  return (
    <div className="space-y-3">
      <AssetsSidebar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          platform={platform}
          onPlatformChange={setPlatform}
          manualTargetUrl={manualTargetUrl}
          onManualTargetUrlChange={setManualTargetUrl}
          deploying={deploying}
          exporting={exporting}
          onDeploy={deploySelected}
          onExport={exportSelected}
        />
      )}

      {filteredAssets.length === 0 ? (
        <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-10 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          No assets match the current filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} {...rowProps(asset)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <AssetListRow key={asset.id} {...rowProps(asset)} />
          ))}
        </div>
      )}
    </div>
  );
}
