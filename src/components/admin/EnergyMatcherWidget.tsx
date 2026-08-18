'use client';

import { useState } from 'react';
import { Target, ChevronDown, X } from 'lucide-react';
import { ENERGY_META } from '@/lib/taskFields';
import type { EnergyRecommendation } from '@/lib/energyMatcher';

interface EnergyMatcherWidgetProps {
  recommendation: EnergyRecommendation;
  matchCount: number;
  active: boolean;
  onToggle: () => void;
}

export default function EnergyMatcherWidget({ recommendation, matchCount, active, onToggle }: EnergyMatcherWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const meta = ENERGY_META[recommendation.level];

  if (dismissed) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl text-xs">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 rounded-lg"
        >
          <span className="text-gray-300 truncate">
            ⚡ {recommendation.label} — {meta.short} Energy Recommended
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-2 text-gray-600 hover:text-gray-300"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="flex items-center gap-3 px-3 pb-2.5 pt-0.5 flex-wrap">
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
      )}
    </div>
  );
}
