'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Swords } from 'lucide-react';
import type { FocusSubtask } from './FocusModeOverlay';

interface BossBattleTask {
  id: string;
  title: string;
  subtasks: FocusSubtask[] | null;
}

interface BossBattleModalProps {
  task: BossBattleTask;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onComplete: (taskId: string) => void;
  onClose: () => void;
}

// Short synthesized victory arpeggio -- Web Audio only, no audio files.
function playFanfare() {
  const ctx = new AudioContext();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const start = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const noteStart = start + i * 0.12;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(noteStart);
    osc.stop(noteStart + 0.45);
  });
  setTimeout(() => ctx.close().catch(() => {}), (notes.length * 0.12 + 0.5) * 1000);
}

export default function BossBattleModal({ task, onToggleSubtask, onComplete, onClose }: BossBattleModalProps) {
  const subtasks = task.subtasks ?? [];
  const total = subtasks.length;
  const doneCount = subtasks.filter((s) => s.done).length;
  const hpPercent = total > 0 ? Math.round(((total - doneCount) / total) * 100) : 100;

  const [shaking, setShaking] = useState(false);
  const [damageText, setDamageText] = useState<string | null>(null);
  const [victorious, setVictorious] = useState(false);
  const hasWonRef = useRef(false);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const damageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (damageTimeoutRef.current) clearTimeout(damageTimeoutRef.current);
    };
  }, []);

  function triggerVictory() {
    if (hasWonRef.current) return;
    hasWonRef.current = true;
    setVictorious(true);
    confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 } });
    playFanfare();
    setTimeout(() => onComplete(task.id), 1200);
  }

  function handleToggle(st: FocusSubtask) {
    if (!st.done) {
      const dmg = Math.round(100 / total);
      setDamageText(`-${dmg} HP!`);
      setShaking(true);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (damageTimeoutRef.current) clearTimeout(damageTimeoutRef.current);
      shakeTimeoutRef.current = setTimeout(() => setShaking(false), 400);
      damageTimeoutRef.current = setTimeout(() => setDamageText(null), 900);

      if (doneCount + 1 >= total) {
        setTimeout(triggerVictory, 350);
      }
    }
    onToggleSubtask(task.id, st.id);
  }

  const barColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 z-[220] bg-[#050810]/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Swords className="w-4 h-4 text-red-400" /> Boss Battle
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {victorious ? (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3 py-8"
            >
              <div className="text-5xl">🏆</div>
              <div className="text-2xl font-bold text-emerald-400">Victory!</div>
              <div className="text-sm text-gray-400">"{task.title}" defeated.</div>
            </motion.div>
          ) : (
            <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="text-center space-y-2">
                <motion.div
                  animate={shaking ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-6xl relative inline-block"
                >
                  👹
                  <AnimatePresence>
                    {damageText && (
                      <motion.span
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: -30 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-2 right-0 text-red-400 font-bold text-sm whitespace-nowrap"
                      >
                        {damageText}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div className="text-base font-semibold text-white">{task.title}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gray-500">
                  <span>Boss HP</span>
                  <span>{hpPercent}%</span>
                </div>
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className={`h-full ${barColor}`}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {total > 0 ? (
                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => handleToggle(st)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className={st.done ? 'text-gray-600 line-through' : 'text-gray-200'}>
                        {st.done ? '⚔️' : '🎯'} {st.title}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <button
                  onClick={triggerVictory}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 text-white font-bold text-sm rounded-2xl px-4 py-4"
                >
                  <Swords className="w-4 h-4" /> Deliver the Final Blow
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
