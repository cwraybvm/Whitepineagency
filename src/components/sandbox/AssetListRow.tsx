'use client';

import { Loader2, Rocket } from 'lucide-react';
import type { CreativeAsset } from './types';
import type { ScorableType } from '@/lib/creativeScore';
import type { Platform } from '@/lib/platformExport';
import { typeBadgeClass, statusBadge } from './assetBadgeStyles';
import ScoreBadge from './ScoreBadge';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function AssetListRow({
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
      className={`rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 border backdrop-blur-md transition-colors ${
        selected
          ? 'bg-[#F0FDF4] border-[#059669] dark:bg-emerald-950/40 dark:border-emerald-500'
          : 'bg-white/85 border-white/60 shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl'
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1">
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
          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${typeBadgeClass(asset.type)}`}>
            {asset.type.replace('_', ' ')}
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{asset.title}</span>
          {asset.organization && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">→ {asset.organization.name}</span>
          )}
          {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
            <span
              key={p}
              className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30"
            >
              {PLATFORM_LABELS[p]} Ready
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 whitespace-pre-wrap">{asset.content}</p>
        <ScoreBadge
          content={asset.content}
          type={asset.type as ScorableType}
          metadata={asset.metadata}
          onOptimized={onOptimized}
        />
      </div>

      {asset.status === 'STAGED' && (
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => onSelectOrg(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select client…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            onClick={onPromote}
            disabled={promoting}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 shrink-0"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Promote to Production
          </button>
        </div>
      )}
    </div>
  );
}
