'use client';

import React from 'react';
import { CHAR_LIMITS } from './types';

export default function CharLimitBadges({ text }: { text: string }) {
  const length = text.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {CHAR_LIMITS.map(({ id, label, limit }) => {
        const over = length > limit;
        return (
          <span
            key={id}
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              over
                ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/40'
                : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {label}: {length}/{limit}
          </span>
        );
      })}
    </div>
  );
}
