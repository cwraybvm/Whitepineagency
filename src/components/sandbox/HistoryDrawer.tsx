'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trash2 } from 'lucide-react';
import type { SandboxHistoryItem } from '@/lib/sandboxHistory';

interface HistoryDrawerProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: SandboxHistoryItem<T>[];
  onRestore: (state: T) => void;
  onClear: () => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryDrawer<T>({ isOpen, onClose, items, onRestore, onClear }: HistoryDrawerProps<T>) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 dark:bg-[#080E1A] dark:border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">History</h3>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 space-y-2">
              {items.length === 0 ? (
                <p className="text-slate-500 dark:text-gray-400 text-[11px] font-sans text-center py-8">
                  No generations yet — your last 10 will show up here.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onRestore(item.state);
                      onClose();
                    }}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950/50 dark:hover:bg-slate-900 dark:border-slate-800/80 rounded-xl p-3 transition-colors"
                  >
                    <p className="text-slate-900 dark:text-white font-sans text-xs line-clamp-2">{item.summary}</p>
                    <p className="text-slate-500 dark:text-gray-500 text-[10px] mt-1">{timeAgo(item.createdAt)}</p>
                  </button>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                <button
                  onClick={onClear}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
