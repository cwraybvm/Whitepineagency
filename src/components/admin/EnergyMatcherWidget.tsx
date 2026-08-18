'use client';

import { Target } from 'lucide-react';
import { ENERGY_META } from '@/lib/taskFields';
import type { EnergyRecommendation } from '@/lib/energyMatcher';

interface EnergyMatcherWidgetProps {
  recommendation: EnergyRecommendation;
  matchCount: number;
  active: boolean;
  onToggle: () => void;
}

export default function EnergyMatcherWidget({ recommendation, matchCount, active, onToggle }: EnergyMatcherWidgetProps) {
  const meta = ENERGY_META[recommendation.level];
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs">
      <span className="font-mono uppercase text-gray-500">⚡ Circadian Energy Matcher</span>
      <span className="text-gray-600">&middot;</span>
      <span className="text-gray-400">{recommendation.label}</span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border ${meta.badge}`}>
        {meta.emoji} {meta.short} recommended
      </span>
      <button
        onClick={onToggle}
        className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium ${
          active ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
        }`}
      >
        <Target className="w-3.5 h-3.5" />
        {active ? `Showing ${matchCount} Match${matchCount === 1 ? '' : 'es'}` : '🎯 Show Recommended Tasks Now'}
      </button>
    </div>
  );
}
