'use client';

import { useEffect, useState } from 'react';
import { loadHistory, addHistoryItem, clearHistory, type SandboxHistoryItem } from '@/lib/sandboxHistory';

export function useSandboxHistory<T>(panelKey: string, scopeId: string | null) {
  const effectiveScope = scopeId || 'none';
  const [items, setItems] = useState<SandboxHistoryItem<T>[]>([]);

  useEffect(() => {
    setItems(loadHistory<T>(panelKey, effectiveScope));
  }, [panelKey, effectiveScope]);

  const add = (summary: string, state: T) => {
    setItems(addHistoryItem<T>(panelKey, effectiveScope, summary, state));
  };

  const clear = () => {
    clearHistory(panelKey, effectiveScope);
    setItems([]);
  };

  return { items, add, clear };
}
