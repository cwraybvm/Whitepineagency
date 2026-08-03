'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Gauge, Wand2, Loader2 } from 'lucide-react';
import { scoreCreative, type ScorableType } from '@/lib/creativeScore';
import type { OptimizeResult } from './types';

export default function ScoreBadge({
  content,
  type,
  metadata,
  onOptimized,
}: {
  content: string;
  type: ScorableType;
  metadata?: any;
  onOptimized?: (result: OptimizeResult) => void;
}) {
  const { score, feedback } = useMemo(() => scoreCreative(content || '', type, metadata), [content, type, metadata]);
  const [optimizing, setOptimizing] = useState(false);

  if (!content?.trim()) return null;

  const tier = score >= 80 ? 'good' : score >= 60 ? 'ok' : 'bad';
  const colorClass =
    tier === 'good'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : tier === 'ok'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-red-500/15 text-red-300 border-red-500/30';

  const optimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'refine', type, content, metadata, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-Optimize failed');
      onOptimized?.({ title: data.title, content: data.content, metadata: data.metadata });
      toast.success('Auto-Optimized — content updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-optimize');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
          <Gauge className="w-3 h-3" /> Predicted Quality: {score}/100
        </span>
        {score < 80 && onOptimized && (
          <button
            onClick={optimize}
            disabled={optimizing}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-60 transition-all"
          >
            {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Auto-Optimize
          </button>
        )}
      </div>
      {feedback.length > 0 && (
        <p className="text-[10px] text-slate-500">{feedback[0]}</p>
      )}
    </div>
  );
}
