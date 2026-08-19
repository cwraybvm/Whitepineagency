'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Minus, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [15, 25, 45, 60];
const MIN_MINUTES = 5;
const MAX_MINUTES = 120;
const STEP_MINUTES = 5;
const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Short synthesized two-note chime -- Web Audio only, no audio files. Same
// technique as BossBattleModal's victory fanfare, just gentler for a sprint
// finishing rather than a task-completion celebration.
function playChime() {
  const ctx = new AudioContext();
  const notes = [880, 1108.73]; // A5, C#6
  const start = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const noteStart = start + i * 0.18;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(noteStart);
    osc.stop(noteStart + 0.65);
  });
  setTimeout(() => ctx.close().catch(() => {}), (notes.length * 0.18 + 0.7) * 1000);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusSprintTimer() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [goal, setGoal] = useState('');
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    function tick() {
      const remaining = Math.max(0, Math.round(((endAtRef.current ?? Date.now()) - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setRunning(false);
        playChime();
        toast.success('Focus sprint complete! Take a breather. 🎯');
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  function applyDuration(minutes: number) {
    if (running) return;
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
  }

  function adjustDuration(delta: number) {
    if (running) return;
    const next = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, durationMinutes + delta));
    applyDuration(next);
  }

  function toggleRunning() {
    if (remainingSeconds <= 0) return;
    if (!running) endAtRef.current = Date.now() + remainingSeconds * 1000;
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setRemainingSeconds(durationMinutes * 60);
  }

  const progressFraction = remainingSeconds / (durationMinutes * 60);
  const dashOffset = CIRCUMFERENCE * (1 - progressFraction);

  return (
    <div className="bg-[#080E1A] border border-white/20 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono uppercase text-gray-400">
        <Zap className="w-3.5 h-3.5 text-amber-400" /> Focus Sprint Timer
      </div>

      <input
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What are you focusing on? (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      />

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={RADIUS} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              stroke="#f59e0b"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-white tabular-nums">
            {formatTime(remainingSeconds)}
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                disabled={running}
                onClick={() => applyDuration(mins)}
                title={mins === 25 ? 'Standard Pomodoro' : `${mins} minutes`}
                className={`flex items-center justify-center min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 ${
                  durationMinutes === mins ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={running || durationMinutes <= MIN_MINUTES}
              onClick={() => adjustDuration(-STEP_MINUTES)}
              title="-5 minutes"
              className="flex items-center justify-center min-w-11 min-h-11 sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs text-gray-400 w-24 text-center">{durationMinutes} min target</span>
            <button
              type="button"
              disabled={running || durationMinutes >= MAX_MINUTES}
              onClick={() => adjustDuration(STEP_MINUTES)}
              title="+5 minutes"
              className="flex items-center justify-center min-w-11 min-h-11 sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRunning}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-11 sm:min-h-0 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={reset}
              title="Reset"
              className="flex items-center justify-center min-w-11 min-h-11 sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
