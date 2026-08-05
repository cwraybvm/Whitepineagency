'use client';

import { Loader2, Rocket } from 'lucide-react';
import type { CreativeAsset } from './types';
import type { ScorableType } from '@/lib/creativeScore';
import type { Platform } from '@/lib/platformExport';
import { typeBadgeClass, statusBadge } from './assetBadgeStyles';
import ScoreBadge from './ScoreBadge';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function AssetCard({
  asset,
  selected,
  onToggleSelected,
  orgs,
  selectedOrgId,
  onSelectOrg,
  onPromote,
  promoting,
  onOptimized,
}: {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  orgs: { id: string; name: string }[];
  selectedOrgId: string | undefined;
  onSelectOrg: (id: string) => void;
  onPromote: () => void;
  promoting: boolean;
  onOptimized: (result: { title?: string; content: string; metadata?: any }) => void;
}) {
  const status = statusBadge(asset.status);

  return (
    <div
      className={`rounded-xl p-5 flex flex-col gap-3 border backdrop-blur-xl transition-colors h-full ${
        selected
          ? 'bg-[#F0FDF4] border-[#059669] dark:bg-emerald-950/40 dark:border-emerald-500'
          : 'bg-white/85 dark:bg-[#121824]/75 border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(asset.id)}
            className="w-3.5 h-3.5 accent-emerald-600"
          />
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${status.container}`}>
            {status.label}
          </span>
        </div>
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadgeClass(asset.type)}`}>
          {asset.type.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{asset.title}</h3>
        {asset.organization && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">→ {asset.organization.name}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap">{asset.content}</p>
      </div>

      {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
            <span
              key={p}
              className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30"
            >
              {PLATFORM_LABELS[p]} Ready
            </span>
          ))}
        </div>
      )}

      <ScoreBadge
        content={asset.content}
        type={asset.type as ScorableType}
        metadata={asset.metadata}
        onOptimized={onOptimized}
      />

      {asset.status === 'STAGED' && (
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => onSelectOrg(e.target.value)}
            className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select client…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            onClick={onPromote}
            disabled={promoting}
            aria-label="Promote to Production"
            title="Promote to Production"
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-lg text-[11px] flex items-center gap-1.5 shrink-0"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
