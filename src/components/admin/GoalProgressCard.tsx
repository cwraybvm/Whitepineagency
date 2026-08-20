'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatGoalReadout, formatGoalRemaining } from '@/lib/goalDisplay';

export interface RewardGoalData {
  id: string;
  title: string;
  targetType: string;
  targetValue: number;
  currentValue: number;
  isUnlocked: boolean;
  rewardIcon: string;
}

const CONFETTI_COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 6.25) % 100}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${(i % 5) * 0.15}s`,
          }}
        />
      ))}
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 6px;
          height: 10px;
          opacity: 0.9;
          animation: confetti-fall 1.8s ease-in infinite;
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(140px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function GoalProgressCard({ goal, onClaimed }: { goal: RewardGoalData; onClaimed: (id: string) => void }) {
  const [claiming, setClaiming] = useState(false);
  const pct = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;

  async function claim() {
    setClaiming(true);
    try {
      const res = await fetch(`/api/bvm/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimed: true }),
      });
      if (res.ok) onClaimed(goal.id);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 space-y-3 ${
        goal.isUnlocked
          ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 to-purple-500/10 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      {goal.isUnlocked && <ConfettiBurst />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{goal.rewardIcon}</span>
          <p className="text-sm font-bold text-white truncate">{goal.title}</p>
        </div>
        {goal.isUnlocked && (
          <span className="shrink-0 text-[10px] font-bold uppercase bg-amber-400 text-black px-2 py-1 rounded-full animate-pulse">
            🎉 Unlocked!
          </span>
        )}
      </div>

      <p className="text-xs text-slate-300">{formatGoalReadout(goal.targetType, goal.currentValue, goal.targetValue)}</p>

      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${goal.isUnlocked ? 'bg-amber-400' : 'bg-purple-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {goal.isUnlocked ? (
        <button
          onClick={claim}
          disabled={claiming}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl disabled:opacity-50"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🏆</span>} Claim Reward
        </button>
      ) : (
        <p className="text-[11px] text-slate-500">{formatGoalRemaining(goal.targetType, goal.currentValue, goal.targetValue)}</p>
      )}
    </div>
  );
}
