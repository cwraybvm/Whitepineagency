'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { type EnergyLevel, ENERGY_META, formatDuration } from '@/lib/taskFields';

export interface StaleTask {
  id: string;
  title: string;
  energyLevel: EnergyLevel | null;
  estimatedMinutes: number | null;
  updatedAt: string;
}

interface StaleTasksModalProps {
  tasks: StaleTask[];
  unstickingId: string | null;
  onUnstick: (taskId: string) => Promise<void>;
  onPark: (taskId: string) => void;
  onDelete: (taskId: string) => Promise<void>;
  onClose: () => void;
}

function daysStale(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

export default function StaleTasksModal({ tasks, unstickingId, onUnstick, onPark, onDelete, onClose }: StaleTasksModalProps) {
  const [index, setIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const task = tasks[Math.min(index, tasks.length - 1)];

  function skip() {
    setIndex((i) => Math.min(i + 1, Math.max(tasks.length - 1, 0)));
  }

  async function handleDelete(taskId: string) {
    setDeletingId(taskId);
    await onDelete(taskId);
    setDeletingId(null);
  }

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            🧹 Sweep Stale Tasks
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!task ? (
          <p className="text-sm text-gray-500 text-center py-6">All swept. Board's fresh.</p>
        ) : (
          <>
            <div className="text-[11px] font-mono uppercase tracking-wider text-gray-500 text-center">
              Task {Math.min(index, tasks.length - 1) + 1} of {tasks.length} &middot; untouched {daysStale(task.updatedAt)} days
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-center">
              <div className="text-base font-semibold text-white">{task.title}</div>
              {task.energyLevel && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${ENERGY_META[task.energyLevel].badge}`}>
                  {ENERGY_META[task.energyLevel].emoji} {ENERGY_META[task.energyLevel].short}
                </span>
              )}
              {task.estimatedMinutes && (
                <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-sky-500/30 bg-sky-500/20 text-sky-300">
                  ⏱️ {formatDuration(task.estimatedMinutes)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUnstick(task.id)}
                disabled={unstickingId === task.id}
                className="flex flex-col items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium px-2 py-3 rounded-xl disabled:opacity-50"
              >
                {unstickingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>💡</span>}
                Unstick
              </button>
              <button
                onClick={() => onPark(task.id)}
                className="flex flex-col items-center gap-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium px-2 py-3 rounded-xl"
              >
                <span>⏸️</span> Park
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                disabled={deletingId === task.id}
                className="flex flex-col items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium px-2 py-3 rounded-xl disabled:opacity-50"
              >
                {deletingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🗑️</span>}
                Delete
              </button>
            </div>

            <button onClick={skip} disabled={tasks.length <= 1} className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 disabled:opacity-30">
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
