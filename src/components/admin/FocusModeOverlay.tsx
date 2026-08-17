'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { X, ChevronLeft, ChevronRight, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react';
import { useBillingTimer } from '@/hooks/useBillingTimer';
import FocusModeTimerWidget from './FocusModeTimerWidget';
import AmbientAudioPlayer from './AmbientAudioPlayer';

export interface FocusSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface FocusOverlayTask {
  id: string;
  title: string;
  subtasks: FocusSubtask[] | null;
  organizationId: string | null;
  estimatedMinutes: number | null;
}

function timerDescription(title: string, subtasks: FocusSubtask[] | null): string {
  if (!subtasks || subtasks.length === 0) return `Worked on ${title}`;
  const doneCount = subtasks.filter((s) => s.done).length;
  return `Worked on ${title}: Completed ${doneCount} micro-step${doneCount === 1 ? '' : 's'}`;
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
  const [autoStart, setAutoStart] = useState(true);

  const task = queue[index] as FocusOverlayTask | undefined;
  const timer = useBillingTimer();
  const prevTaskRef = useRef<FocusOverlayTask | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('focusMode.autoStartTimer');
    if (stored !== null) setAutoStart(stored === 'true');
  }, []);

  function toggleAutoStart() {
    setAutoStart((prev) => {
      const next = !prev;
      localStorage.setItem('focusMode.autoStartTimer', String(next));
      return next;
    });
  }

  async function stopTimerFor(t: FocusOverlayTask) {
    if (timer.active && timer.active.organizationId === t.organizationId) {
      await timer.stop(timerDescription(t.title, t.subtasks));
    }
  }

  // Auto-start/stop the billing timer as the active task changes (mount, Next/Previous, or
  // auto-advance after Done). Stops the outgoing task's entry (if this overlay started it)
  // before starting one for the incoming task, so the two never overlap under the server's
  // single-active-entry constraint.
  useEffect(() => {
    if (!task) return;
    const prev = prevTaskRef.current;
    prevTaskRef.current = task;

    (async () => {
      if (prev && prev.id !== task.id) {
        await stopTimerFor(prev);
      }
      if (autoStart && task.organizationId) {
        const result = await timer.start(task.organizationId);
        if (!result.ok) toast.error(`Billing timer: ${result.error}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    if (!running) return;
    const intervalId = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(intervalId);
  }, [running]);

  // Pre-populate the timer from the task's own estimate (mount + every Prev/Next
  // switch), falling back to the default when it has none set.
  useEffect(() => {
    setMinutes(task?.estimatedMinutes || 25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, task?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, task?.id]);

  if (!task) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  async function handleClose() {
    if (task) await stopTimerFor(task);
    onClose();
  }

  async function handleBreakDown() {
    if (!task) return;
    setBreakingDown(true);
    await onBreakDown(task.id);
    setBreakingDown(false);
  }

  async function handleDone() {
    if (!task) return;
    await stopTimerFor(task);
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
          onClick={handleClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-4">
          Focus Mode &middot; Task {index + 1} of {queue.length}
        </div>

        {/* Outside the key={task.id} block below so the AudioContext survives
            Prev/Next task navigation instead of restarting each time. */}
        <div className="w-full max-w-xl mb-6">
          <AmbientAudioPlayer />
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

            <button
              onClick={handleBreakDown}
              disabled={breakingDown}
              className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-gray-400 text-xs rounded-xl px-3 py-3 disabled:opacity-50"
            >
              {breakingDown ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
              {breakingDown ? 'Breaking down…' : 'Unstick Me'}
            </button>
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

          <FocusModeTimerWidget
            organizationId={task.organizationId}
            active={timer.active}
            elapsed={timer.elapsed}
            autoStart={autoStart}
            onToggleAutoStart={toggleAutoStart}
          />

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
