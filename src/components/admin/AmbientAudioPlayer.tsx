'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Waves, Radio, Music } from 'lucide-react';

type Track = 'brown-noise' | 'binaural' | 'lofi';

const TRACKS: { id: Track; label: string; icon: typeof Waves }[] = [
  { id: 'brown-noise', label: 'Brown Noise', icon: Waves },
  { id: 'binaural', label: 'Binaural Beats', icon: Radio },
  { id: 'lofi', label: 'Lo-Fi Pad', icon: Music },
];

// All three tracks are synthesized live via Web Audio API — no audio files
// ship with this app, and none are fetched from anywhere. "Lo-Fi Pad" is an
// ambient approximation (detuned oscillators + lowpass), not real lo-fi
// hip-hop with drums/vinyl crackle.
function buildBrownNoiseSource(ctx: AudioContext): AudioNode {
  const duration = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start();
  return source;
}

function buildBinauralSource(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const merger = ctx.createChannelMerger(2);
  merger.connect(destination);

  const left = ctx.createOscillator();
  left.type = 'sine';
  left.frequency.value = 200;
  const leftPan = ctx.createStereoPanner();
  leftPan.pan.value = -1;
  left.connect(leftPan).connect(merger, 0, 0);
  left.start();

  const right = ctx.createOscillator();
  right.type = 'sine';
  right.frequency.value = 210;
  const rightPan = ctx.createStereoPanner();
  rightPan.pan.value = 1;
  right.connect(rightPan).connect(merger, 0, 1);
  right.start();

  return [left, right, leftPan, rightPan, merger];
}

function buildLofiSource(ctx: AudioContext): AudioNode[] {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const chord = [130.81, 155.56, 196.0]; // C3, Eb3, G3 — soft minor triad
  const oscillators = chord.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
    return osc;
  });

  return [...oscillators, filter];
}

export default function AmbientAudioPlayer() {
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  function teardownGraph() {
    for (const node of nodesRef.current) {
      try {
        (node as OscillatorNode | AudioBufferSourceNode).stop?.();
      } catch {
        // already stopped
      }
      node.disconnect();
    }
    nodesRef.current = [];
  }

  function ensureContext(): { ctx: AudioContext; gain: GainNode } {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
    }
    return { ctx: ctxRef.current, gain: gainRef.current! };
  }

  function buildGraph(next: Track) {
    const { ctx, gain } = ensureContext();
    teardownGraph();
    if (next === 'brown-noise') {
      const source = buildBrownNoiseSource(ctx);
      source.connect(gain);
      nodesRef.current = [source];
    } else if (next === 'binaural') {
      nodesRef.current = buildBinauralSource(ctx, gain);
    } else {
      const nodes = buildLofiSource(ctx);
      const filter = nodes[nodes.length - 1];
      filter.connect(gain);
      nodesRef.current = nodes;
    }
  }

  function selectTrack(next: Track) {
    setTrack(next);
    buildGraph(next);
    ctxRef.current?.resume();
    setPlaying(true);
  }

  function togglePlay() {
    if (!track) {
      selectTrack('brown-noise');
      return;
    }
    if (playing) {
      ctxRef.current?.suspend();
      setPlaying(false);
    } else {
      ctxRef.current?.resume();
      setPlaying(true);
    }
  }

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      teardownGraph();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-wrap">
      {TRACKS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => selectTrack(id)}
          title={label}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
            track === id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Icon className="w-3 h-3" /> {label}
        </button>
      ))}

      <button
        onClick={togglePlay}
        className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      <div className="flex items-center gap-1.5">
        <Volume2 className="w-3.5 h-3.5 text-gray-500" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-16 accent-indigo-400"
        />
      </div>
    </div>
  );
}
