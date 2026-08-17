'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, ChevronLeft, ChevronRight, Zap, Loader2, CheckCircle2 } from 'lucide-react';

export interface FocusSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface FocusOverlayTask {
  id: string;
  title: string;
  subtasks: FocusSubtask[] | null;
}

interface FocusModeOverlayProps {
  tasks: FocusOverlayTask[];
  startIndex: number;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onBreakDown: (taskId: string) => Promise<void>;
}

const DURATIONS = [15, 25];

export default function FocusModeOverlay({
  tasks,
  startIndex,
  onClose,
  onComplete,
  onToggleSubtask,
  onBreakDown,
}: FocusModeOverlayProps) {
  const [queue, setQueue] = useState(tasks);
  const [index, setIndex] = useState(startIndex);
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  const task = queue[index] as FocusOverlayTask | undefined;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, task?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!task) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  async function handleBreakDown() {
    if (!task) return;
    setBreakingDown(true);
    await onBreakDown(task.id);
    setBreakingDown(false);
  }

  function handleDone() {
    if (!task) return;
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    onComplete(task.id);
    const doneId = task.id;
    setTimeout(() => {
      const next = queue.filter((t) => t.id !== doneId);
      if (next.length === 0) {
        onClose();
        return;
      }
      setQueue(next);
      setIndex((i) => Math.min(i, next.length - 1));
    }, 700);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-[#050810]/97 backdrop-blur-xl flex flex-col items-center justify-center p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-4">
          Focus Mode &middot; Task {index + 1} of {queue.length}
        </div>

        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl space-y-6"
        >
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center leading-tight">{task.title}</h1>

          <div className="space-y-2">
            {(task.subtasks ?? []).map((st) => (
              <label
                key={st.id}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={st.done}
                  onChange={() => onToggleSubtask(task.id, st.id)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className={`text-sm ${st.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {st.title}
                </span>
              </label>
            ))}

            {!task.subtasks?.length && (
              <button
                onClick={handleBreakDown}
                disabled={breakingDown}
                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-gray-400 text-xs rounded-xl px-3 py-3 disabled:opacity-50"
              >
                {breakingDown ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {breakingDown ? 'Breaking down…' : 'Break into Micro-Steps'}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            {DURATIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  minutes === m ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400'
                }`}
              >
                {m}m
              </button>
            ))}
            <div className="text-3xl font-mono text-white tabular-nums px-2">
              {mm}:{ss}
            </div>
            <button
              onClick={() => setRunning((r) => !r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10"
            >
              {running ? 'Pause' : 'Start'}
            </button>
          </div>

          <button
            onClick={handleDone}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-2xl px-4 py-4 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" /> Done / Complete
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(i + 1, queue.length - 1))}
              disabled={index >= queue.length - 1}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white disabled:opacity-30"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
