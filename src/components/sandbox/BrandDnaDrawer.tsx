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
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [accentColors, setAccentColors] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [brandImages, setBrandImages] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && organizationId) {
      setUrl('');
      setAccentColors([]);
      setPrimaryColor(null);
      setBrandImages([]);
      fetch(`/api/sandbox/brand?organizationId=${organizationId}`)
        .then((res) => res.json())
        .then((data) => {
          setBrandVoice(data.brandVoice || '');
          setBrandGuidelines(data.brandGuidelines || '');
        })
        .catch(() => {});
    }
  }, [isOpen, organizationId]);

  const extractFromUrl = async () => {
    if (!url.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/sandbox/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setBrandVoice(data.brandVoice || brandVoice);
      setBrandGuidelines((prev) => [data.brandGuidelines, prev].filter(Boolean).join('\n\n'));
      setAccentColors(data.accentColors || []);
      setBrandImages(data.brandImages || []);
      toast.success('Brand DNA extracted — review before saving');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract brand DNA');
    } finally {
      setExtracting(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          brandVoice,
          brandGuidelines,
          ...(primaryColor ? { primaryColor } : {}),
        }),
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
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 dark:bg-[#080E1A] dark:border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Brand DNA</h3>
                  </div>
                  <p className="text-slate-500 dark:text-gray-400 text-[10px] mt-0.5 font-sans">
                    Persona injected into every generation for: <strong className="text-indigo-600 dark:text-indigo-300">{organizationName}</strong>
                  </p>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <label className="text-slate-500 dark:text-gray-400 font-bold block text-[10px]">
                  Extract Brand DNA from URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://clientwebsite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-slate-50/80 border border-slate-200 text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white p-2.5 rounded-xl font-sans text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={extractFromUrl}
                    disabled={extracting || !url.trim()}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5"
                  >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extracting ? 'Extracting…' : 'Extract'}
                  </button>
                </div>
                {accentColors.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-500 dark:text-gray-400 text-[9px] font-sans">Accent colors:</span>
                    {accentColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        title={color}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          primaryColor === color ? 'border-emerald-500 scale-110' : 'border-slate-300 dark:border-slate-700'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
                {brandImages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-slate-500 dark:text-gray-400 text-[9px] font-sans w-full">Discovered images:</span>
                    {brandImages.map((imgUrl) => (
                      <button
                        key={imgUrl}
                        type="button"
                        onClick={() => window.open(imgUrl, '_blank', 'noopener,noreferrer')}
                        title={imgUrl}
                        className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0"
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form id="brand-dna-form" onSubmit={save} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-gray-400 font-bold block text-[10px]">Brand Voice (short tone label)</label>
                  <input
                    type="text"
                    placeholder="e.g. Confident, no-fluff, blue-collar friendly"
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white p-2.5 rounded-xl font-sans text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-gray-400 font-bold block text-[10px]">Brand Guidelines (fuller persona notes)</label>
                  <textarea
                    placeholder="e.g. Always mention our 24/7 emergency line. Never use fear-based language about safety. Prefer plain language over jargon."
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white p-2.5 rounded-xl font-sans text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
                  />
                </div>
                <p className="text-slate-500 dark:text-gray-500 text-[9px] font-sans">
                  * Left blank, generation falls back to a default professional local-service tone.
                </p>
              </form>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 font-bold rounded-2xl cursor-pointer"
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
