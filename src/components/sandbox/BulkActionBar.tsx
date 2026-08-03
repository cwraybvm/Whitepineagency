'use client';

import { Loader2, Send, FileArchive } from 'lucide-react';
import type { Platform } from '@/lib/platformExport';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function BulkActionBar({
  selectedCount,
  platform,
  onPlatformChange,
  manualTargetUrl,
  onManualTargetUrlChange,
  deploying,
  exporting,
  onDeploy,
  onExport,
}: {
  selectedCount: number;
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  manualTargetUrl: string;
  onManualTargetUrlChange: (v: string) => void;
  deploying: boolean;
  exporting: boolean;
  onDeploy: () => void;
  onExport: () => void;
}) {
  return (
    <div className="bg-white/85 border border-[#059669]/40 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-indigo-500/40 dark:shadow-2xl rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedCount} selected</span>
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => onPlatformChange(p)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              platform === p ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>
      <input
        value={manualTargetUrl}
        onChange={(e) => onManualTargetUrlChange(e.target.value)}
        placeholder="Target URL (used if the client has no custom domain set)…"
        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 min-w-[220px]"
      />
      <button
        onClick={onDeploy}
        disabled={deploying}
        className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
      >
        {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Deploy Campaign
      </button>
      <button
        onClick={onExport}
        disabled={exporting}
        className="py-2 px-3 bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
      >
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
        Export ZIP
      </button>
    </div>
  );
}
