'use client';

import { useEffect, useRef, useState } from 'react';
import { VolumeX, Volume2, Waves, CloudRain, Brain, Zap } from 'lucide-react';
import { createAmbientAudioEngine, AMBIENT_PRESETS, type AmbientPreset, type AmbientAudioEngine } from '@/lib/ambientAudio';

const PRESET_KEY = 'focusAudio.preset';
const VOLUME_KEY = 'focusAudio.volume';

const PRESET_ICONS: Record<AmbientPreset, typeof Waves> = {
  OFF: VolumeX,
  BROWN_NOISE: Waves,
  RAIN: CloudRain,
  ALPHA_BEATS: Brain,
  BETA_BEATS: Zap,
};

function loadPreset(): AmbientPreset {
  try {
    const stored = localStorage.getItem(PRESET_KEY);
    if (AMBIENT_PRESETS.some((p) => p.id === stored)) return stored as AmbientPreset;
  } catch {}
  return 'OFF';
}

function loadVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) return parsed;
    }
  } catch {}
  return 0.4;
}

export default function AmbientAudioPlayer() {
  const [preset, setPreset] = useState<AmbientPreset>('OFF');
  const [volume, setVolume] = useState(0.4);
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  // Restore the last preset/volume choice for display only -- actually
  // starting audio waits for a click, since browsers block autoplay
  // without a user gesture anyway.
  useEffect(() => {
    setPreset(loadPreset());
    setVolume(loadVolume());
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.close();
      engineRef.current = null;
    };
  }, []);

  function ensureEngine(): AmbientAudioEngine {
    if (!engineRef.current) {
      engineRef.current = createAmbientAudioEngine(volume);
    }
    return engineRef.current;
  }

  function selectPreset(next: AmbientPreset) {
    setPreset(next);
    try {
      localStorage.setItem(PRESET_KEY, next);
    } catch {}
    if (next === 'OFF') {
      engineRef.current?.setPreset('OFF');
      return;
    }
    ensureEngine().setPreset(next);
  }

  function changeVolume(next: number) {
    setVolume(next);
    try {
      localStorage.setItem(VOLUME_KEY, String(next));
    } catch {}
    engineRef.current?.setVolume(next);
  }

  return (
    <div className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-wrap">
      <span className="text-[11px] font-mono uppercase text-gray-500 shrink-0">🎧 Focus Audio</span>

      {AMBIENT_PRESETS.map(({ id, label }) => {
        const Icon = PRESET_ICONS[id];
        return (
          <button
            key={id}
            onClick={() => selectPreset(id)}
            title={label}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
              preset === id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        );
      })}

      <div className="flex items-center gap-1.5 ml-auto">
        <Volume2 className="w-3.5 h-3.5 text-gray-500" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          className="w-16 accent-indigo-400"
        />
      </div>
    </div>
  );
}
