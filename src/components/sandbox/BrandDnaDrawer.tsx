'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BrandDnaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onSaved: () => void;
}

export default function BrandDnaDrawer({ isOpen, onClose, organizationId, organizationName, onSaved }: BrandDnaDrawerProps) {
  const [brandVoice, setBrandVoice] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetch(`/api/sandbox/brand?organizationId=${organizationId}`)
        .then((res) => res.json())
        .then((data) => {
          setBrandVoice(data.brandVoice || '');
          setBrandGuidelines(data.brandGuidelines || '');
        })
        .catch(() => {});
    }
  }, [isOpen, organizationId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, brandVoice, brandGuidelines }),
      });
      if (!res.ok) throw new Error('Failed to save brand DNA');
      toast.success(`Saved brand DNA for ${organizationName}`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error saving brand DNA');
    } finally {
      setSaving(false);
    }
  };

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
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#080E1A] border-l border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Brand DNA</h3>
                  </div>
                  <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
                    Persona injected into every generation for: <strong className="text-indigo-300">{organizationName}</strong>
                  </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="brand-dna-form" onSubmit={save} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-gray-400 font-bold block text-[10px]">Brand Voice (short tone label)</label>
                  <input
                    type="text"
                    placeholder="e.g. Confident, no-fluff, blue-collar friendly"
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-bold block text-[10px]">Brand Guidelines (fuller persona notes)</label>
                  <textarea
                    placeholder="e.g. Always mention our 24/7 emergency line. Never use fear-based language about safety. Prefer plain language over jargon."
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-sky-500 resize-none"
                  />
                </div>
                <p className="text-gray-500 text-[9px] font-sans">
                  * Left blank, generation falls back to a default professional local-service tone.
                </p>
              </form>
            </div>

            <div className="border-t border-white/10 pt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-bold rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="brand-dna-form"
                disabled={saving}
                className="w-2/3 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-2xl cursor-pointer shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Brand DNA'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
