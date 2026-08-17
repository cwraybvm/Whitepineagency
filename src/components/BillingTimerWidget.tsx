'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ActiveEntry {
  id: string;
  organizationId: string;
  startTime: string;
  endTime: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function BillingTimerWidget() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/clients').then((res) => res.json()).then((list: ClientOption[]) => {
      setClients(list);
      if (list.length > 0) setSelectedClientId((prev) => prev || list[0].id);
    });
    fetch('/api/time-entries').then((res) => res.json()).then((entry: ActiveEntry | null) => {
      setActive(entry);
      if (entry) setSelectedClientId(entry.organizationId);
    });
  }, []);

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

  async function handleStart() {
    if (!selectedClientId) {
      toast.error('Select a client first');
      return;
    }
    const res = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: selectedClientId }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error || 'Failed to start timer');
      return;
    }
    setActive(await res.json());
  }

  async function handleStop() {
    if (!active) return;
    const res = await fetch(`/api/time-entries/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (!res.ok) {
      toast.error('Failed to stop timer');
      return;
    }
    toast.success('Time entry saved as pending billable time');
    setActive(null);
  }

  return (
    <div className="fixed top-4 right-4 z-[150] bg-[#080E1A] border border-white/20 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 font-mono text-xs">
      <Clock className="w-4 h-4 text-emerald-400" />
      <select
        value={selectedClientId}
        onChange={(e) => setSelectedClientId(e.target.value)}
        disabled={!!active}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs disabled:opacity-50"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="text-white tabular-nums w-16 text-center">{formatElapsed(elapsed)}</span>
      {active ? (
        <button onClick={handleStop} className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-lg">
          <Square className="w-3 h-3" /> Stop
        </button>
      ) : (
        <button onClick={handleStart} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg">
          <Play className="w-3 h-3" /> Start
        </button>
      )}
    </div>
  );
}
