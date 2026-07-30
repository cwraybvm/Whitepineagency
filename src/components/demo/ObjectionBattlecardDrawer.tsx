'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, DollarSign, Users, Clock, Heart, FileText, Wrench } from 'lucide-react';

interface Objection {
  id: string;
  category: string;
  color: string;
  icon: typeof DollarSign;
  question: string;
  response: string;
}

const OBJECTIONS: Objection[] = [
  {
    id: 'pricing',
    category: 'PRICING',
    color: '#F59E0B',
    icon: DollarSign,
    question: 'Pricing concern — "This seems expensive"',
    response:
      "Compare it to what a single missed emergency call is worth — most of your jobs run $300-$1,500. If this saves even one job a month, it's already paid for itself. Everything after that is pure upside.",
  },
  {
    id: 'answering-service',
    category: 'COMPETITION',
    color: '#8B5CF6',
    icon: Users,
    question: 'We already have an answering service',
    response:
      'An answering service still makes the caller wait on hold or leave a voicemail. Our system texts them back in under 15 seconds, automatically, 24/7 — no hold music, no waiting for a callback. It works alongside your existing service, not against it.',
  },
  {
    id: 'setup-speed',
    category: 'TIMELINE',
    color: '#0EA5E9',
    icon: Clock,
    question: 'How fast does it set up?',
    response:
      "Same day for most accounts. We provision your dedicated number, connect it to your existing line, and you're live within 24-48 hours. No hardware, no contracts to sign with your phone carrier.",
  },
  {
    id: 'ai-trust',
    category: 'TRUST',
    color: '#10B981',
    icon: Heart,
    question: 'Will my customers know it\'s AI?',
    response:
      "It reads as a normal text from your business — friendly, on-brand, and fast. Customers care that someone responded, not what generated the message. You can review and tweak the exact wording before it goes live.",
  },
  {
    id: 'industry-fit',
    category: 'FIT',
    color: '#EC4899',
    icon: Wrench,
    question: 'Will this work for my industry?',
    response:
      'If you get inbound calls and lose jobs to voicemail or slow follow-up, it fits — HVAC, plumbing, electrical, roofing, legal intake, med spas, we\'ve deployed it across all of them. We customize the reply copy to your trade.',
  },
  {
    id: 'contract',
    category: 'CONTRACT',
    color: '#EF4444',
    icon: FileText,
    question: 'Are we locked into a contract?',
    response:
      "Month-to-month. No long-term commitment. If it's not generating booked jobs within the first cycle, you cancel — no cancellation fee, no hassle.",
  },
];

interface ObjectionBattlecardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ObjectionBattlecardDrawer({ isOpen, onClose }: ObjectionBattlecardDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#080E1A] border-l border-white/10 z-[150] p-6 shadow-2xl flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">Objection Battlecards</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Quick-reference responses for common pushback during a live pitch.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {OBJECTIONS.map((obj) => {
                const Icon = obj.icon;
                return (
                  <div
                    key={obj.id}
                    className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-2 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={{
                          color: obj.color,
                          borderColor: `${obj.color}40`,
                          backgroundColor: `${obj.color}14`,
                        }}
                      >
                        <Icon className="w-2.5 h-2.5" /> {obj.category}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white leading-snug">{obj.question}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{obj.response}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
