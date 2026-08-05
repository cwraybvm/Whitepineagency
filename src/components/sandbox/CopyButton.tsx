'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op, button just won't flip to "Copied!"
    }
  };

  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className={`absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
        copied
          ? 'opacity-100 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          : 'bg-white/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
