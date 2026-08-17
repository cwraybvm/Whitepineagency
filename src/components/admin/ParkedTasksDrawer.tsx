'use client';

import { X, Package, Undo2 } from 'lucide-react';

interface ParkedTask {
  id: string;
  title: string;
}

interface ParkedTasksDrawerProps {
  tasks: ParkedTask[];
  onUnpark: (taskId: string) => void;
  onClose: () => void;
}

export default function ParkedTasksDrawer({ tasks, onUnpark, onClose }: ParkedTasksDrawerProps) {
  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Package className="w-4 h-4 text-orange-400" /> Parked ({tasks.length})
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Nothing parked. Board's clear.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
              >
                <span className="text-sm text-gray-200">{t.title}</span>
                <button
                  onClick={() => onUnpark(t.id)}
                  className="flex items-center gap-1 shrink-0 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Unpark
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
