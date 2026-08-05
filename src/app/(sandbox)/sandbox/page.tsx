'use client';

import React, { useState } from 'react';
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop, Fingerprint, Calendar } from 'lucide-react';
import CopyStudioPanel from '@/components/sandbox/CopyStudioPanel';
import AdBuilderPanel from '@/components/sandbox/AdBuilderPanel';
import VideoLabPanel from '@/components/sandbox/VideoLabPanel';
import CampaignBatchPanel from '@/components/sandbox/CampaignBatchPanel';
import SwipeAnalyzerPanel from '@/components/sandbox/SwipeAnalyzerPanel';
import LandingPageStudioPanel from '@/components/sandbox/LandingPageStudioPanel';
import BrandIdentityPanel from '@/components/sandbox/BrandIdentityPanel';
import MasterCampaignPanel from '@/components/sandbox/MasterCampaignPanel';
import StagedAssetsList from '@/components/sandbox/StagedAssetsList';
import BrandDnaHud from '@/components/sandbox/BrandDnaHud';
import type { SandboxTool } from '@/components/sandbox/types';
import type { BrandDna } from '@/lib/sandboxPrompts';

const TABS: { id: SandboxTool; label: string; icon: React.ElementType }[] = [
  { id: 'copy', label: 'Copy Studio', icon: PenTool },
  { id: 'ad', label: 'Ad Builder', icon: LayoutTemplate },
  { id: 'video', label: 'Video Lab', icon: Clapperboard },
  { id: 'landing-page', label: 'Landing Page Studio', icon: LayoutPanelTop },
  { id: 'campaign', label: 'Campaign Engine', icon: Rocket },
  { id: 'swipe', label: 'Ad Swipe File', icon: ScanSearch },
  { id: 'brand-identity', label: 'Brand Identity', icon: Fingerprint },
  { id: 'master-campaign', label: '30-Day Campaign', icon: Calendar },
];

export default function SandboxPage() {
  const [activeTool, setActiveTool] = useState<SandboxTool>('copy');
  const [view, setView] = useState<'draft' | 'staged'>('draft');
  const [activeBrandDna, setActiveBrandDna] = useState<BrandDna | null>(null);
  const [pendingInsert, setPendingInsert] = useState<{ tool: SandboxTool; text: string } | null>(null);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="bg-white/85 border border-white/60 shadow-sm backdrop-blur-md dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-6">
        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> CREATIVE SANDBOX
        </span>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Creative Sandbox Workspace</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generate, stage, and promote client creative assets straight into production.
        </p>
      </div>

      <BrandDnaHud />

      {/* Tabs + Draft/Staged toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/85 border border-white/60 shadow-sm backdrop-blur-md dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-2">
        <div className="flex gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTool === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTool(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-[#059669] text-white border-[#059669] dark:bg-emerald-600 dark:border-emerald-600'
                    : 'text-slate-500 border-transparent dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setView('draft')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              view === 'draft' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3 h-3" /> Draft Canvas
          </button>
          <button
            onClick={() => setView('staged')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              view === 'staged' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Archive className="w-3 h-3" /> Staged Assets
          </button>
        </div>
      </div>

      {view === 'draft' ? (
        <>
          {activeTool === 'copy' && (
            <CopyStudioPanel
              activeBrandDna={activeBrandDna}
              pendingInsert={pendingInsert?.tool === 'copy' ? pendingInsert : null}
              onInsertConsumed={() => setPendingInsert(null)}
            />
          )}
          {activeTool === 'ad' && (
            <AdBuilderPanel
              activeBrandDna={activeBrandDna}
              pendingInsert={pendingInsert?.tool === 'ad' ? pendingInsert : null}
              onInsertConsumed={() => setPendingInsert(null)}
            />
          )}
          {activeTool === 'video' && (
            <VideoLabPanel
              activeBrandDna={activeBrandDna}
              pendingInsert={pendingInsert?.tool === 'video' ? pendingInsert : null}
              onInsertConsumed={() => setPendingInsert(null)}
            />
          )}
          {activeTool === 'landing-page' && <LandingPageStudioPanel />}
          {activeTool === 'campaign' && (
            <CampaignBatchPanel
              activeBrandDna={activeBrandDna}
              pendingInsert={pendingInsert?.tool === 'campaign' ? pendingInsert : null}
              onInsertConsumed={() => setPendingInsert(null)}
            />
          )}
          {activeTool === 'swipe' && <SwipeAnalyzerPanel />}
          {activeTool === 'brand-identity' && (
            <BrandIdentityPanel
              onApplyBrandDna={setActiveBrandDna}
              onInsertPhrase={(tool, text) => {
                setPendingInsert({ tool, text });
                setActiveTool(tool);
              }}
            />
          )}
          {activeTool === 'master-campaign' && <MasterCampaignPanel activeBrandDna={activeBrandDna} />}
        </>
      ) : (
        <StagedAssetsList activeTool={activeTool} />
      )}
    </div>
  );
}
