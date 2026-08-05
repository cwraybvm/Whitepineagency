'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcuts = [
    { key: 'Cmd / Ctrl + K', description: 'Open Command Palette' },
    { key: 'Alt + Q', description: 'Launch Solution Quoter' },
    { key: 'Shift + ?', description: 'Toggle Keyboard Shortcuts' },
    { key: 'ESC', description: 'Close Modals & Drawers' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                <span>Keyboard Shortcuts</span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5"
                >
                  <span className="text-gray-300 font-sans">{sc.description}</span>
                  <kbd className="bg-slate-900 text-indigo-300 border border-indigo-500/30 border-b-2 border-b-indigo-500/70 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}