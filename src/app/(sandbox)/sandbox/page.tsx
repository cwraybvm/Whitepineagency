'use client';

import React, { useState } from 'react';
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch } from 'lucide-react';
import CopyStudioPanel from '@/components/sandbox/CopyStudioPanel';
import AdBuilderPanel from '@/components/sandbox/AdBuilderPanel';
import VideoLabPanel from '@/components/sandbox/VideoLabPanel';
import CampaignBatchPanel from '@/components/sandbox/CampaignBatchPanel';
import SwipeAnalyzerPanel from '@/components/sandbox/SwipeAnalyzerPanel';
import StagedAssetsList from '@/components/sandbox/StagedAssetsList';
import type { SandboxTool } from '@/components/sandbox/types';

const TABS: { id: SandboxTool; label: string; icon: React.ElementType }[] = [
  { id: 'copy', label: 'Copy Studio', icon: PenTool },
  { id: 'ad', label: 'Ad Builder', icon: LayoutTemplate },
  { id: 'video', label: 'Video Lab', icon: Clapperboard },
  { id: 'campaign', label: 'Campaign Engine', icon: Rocket },
  { id: 'swipe', label: 'Ad Swipe File', icon: ScanSearch },
];

export default function SandboxPage() {
  const [activeTool, setActiveTool] = useState<SandboxTool>('copy');
  const [view, setView] = useState<'draft' | 'staged'>('draft');

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> CREATIVE SANDBOX
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">AI Creative Sandbox Workspace</h1>
        <p className="text-xs text-slate-400">
          Generate, stage, and promote client creative assets straight into production.
        </p>
      </div>

      {/* Tabs + Draft/Staged toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-2">
        <div className="flex gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTool === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTool(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setView('draft')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              view === 'draft' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3 h-3" /> Draft Canvas
          </button>
          <button
            onClick={() => setView('staged')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              view === 'staged' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3 h-3" /> Staged Assets
          </button>
        </div>
      </div>

      {view === 'draft' ? (
        <>
          {activeTool === 'copy' && <CopyStudioPanel />}
          {activeTool === 'ad' && <AdBuilderPanel />}
          {activeTool === 'video' && <VideoLabPanel />}
          {activeTool === 'campaign' && <CampaignBatchPanel />}
          {activeTool === 'swipe' && <SwipeAnalyzerPanel />}
        </>
      ) : (
        <StagedAssetsList activeTool={activeTool} />
      )}
    </div>
  );
}
