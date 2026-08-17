'use client';

import { useEffect, useState } from 'react';
import { X, Wind } from 'lucide-react';

interface DopamineResetDrawerProps {
  onClose: () => void;
}

const RESET_POOL = [
  'Hydrate — drink a full glass of water',
  '5-second stretch — reach overhead and hold',
  'Look 20ft away for 20 seconds (20-20-20 rule)',
  'Stand up and shake out your hands',
  'Take 5 slow, deep breaths',
  'Step to a window or outside for fresh air',
  'Do 10 jumping jacks',
  'Splash cold water on your face',
  'Tidy one small thing within reach',
  'Sit quietly and do nothing for a moment',
];

const RESET_SECONDS = 5 * 60;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function DopamineResetDrawer({ onClose }: DopamineResetDrawerProps) {
  const [picks] = useState(() => shuffle(RESET_POOL).slice(0, 5));
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onClose();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, onClose]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = ((RESET_SECONDS - secondsLeft) / RESET_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5 text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Wind className="w-4 h-4 text-emerald-400" /> 5-Min Reset
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-4xl font-mono text-white tabular-nums">
          {mm}:{ss}
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="space-y-2 text-left">
          {picks.map((tip) => (
            <div key={tip} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200">
              {tip}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-2xl px-4 py-3"
        >
          Back to Focus
        </button>
      </div>
    </div>
  );
}
