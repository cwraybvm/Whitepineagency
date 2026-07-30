'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Phone, Star, Activity } from 'lucide-react';

interface ActivitySignal {
  id: string;
  timestamp: string;
  clientName: string;
  event: string;
  type: 'call' | 'webhook' | 'review';
}

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivitySignal[];
}

export default function ActivityDrawer({ isOpen, onClose, activities }: ActivityDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#080E1A] border-l border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase">Real-Time Event Stream</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1.5 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold">[{act.timestamp}]</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                      {act.type === 'call' && <Phone className="w-3 h-3 text-emerald-400" />}
                      {act.type === 'webhook' && <Zap className="w-3 h-3 text-amber-400" />}
                      {act.type === 'review' && <Star className="w-3 h-3 text-purple-400" />}
                      {act.type}
                    </span>
                  </div>
                  <div className="font-sans text-xs text-white font-bold">{act.clientName}</div>
                  <div className="text-emerald-300 text-[11px] font-sans">{act.event}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}