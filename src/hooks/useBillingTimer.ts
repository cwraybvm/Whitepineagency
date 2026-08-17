'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ActiveEntry {
  id: string;
  organizationId: string;
  startTime: string;
  endTime: string | null;
  description: string | null;
}

type Result = { ok: true } | { ok: false; error: string };

const CHANGE_EVENT = 'billing-timer:changed';

// Server enforces a single app-wide active entry (endTime IS NULL), so every
// hook instance shares that one entry — the CustomEvent is what keeps
// BillingTimerWidget (in the layout) and the Focus Mode widget (in the
// overlay) in sync when they're mounted at the same time.
export function useBillingTimer() {
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/time-entries');
    setActive(res.ok ? await res.json() : null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!active) {
      if (tickRef.current) clearInterval(tickRef.current);
      setElapsed(0);
      return;
    }
    const start = new Date(active.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [active]);

  async function start(organizationId: string): Promise<Result> {
    const res = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to start timer' }));
      return { ok: false, error: body.error || 'Failed to start timer' };
    }
    setActive(await res.json());
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  }

  async function stop(description?: string): Promise<Result> {
    if (!active) return { ok: false, error: 'No active timer' };
    const res = await fetch(`/api/time-entries/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', description }),
    });
    if (!res.ok) {
      return { ok: false, error: 'Failed to stop timer' };
    }
    setActive(null);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  }

  return { active, elapsed, loading, start, stop, refresh };
}
