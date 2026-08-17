'use client';

import { useEffect, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useBillingTimer } from '@/hooks/useBillingTimer';

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
  const { active, elapsed, start, stop } = useBillingTimer();

  useEffect(() => {
    fetch('/api/clients').then((res) => (res.ok ? res.json() : [])).then((list: ClientOption[]) => {
      setClients(list);
      if (list.length > 0) setSelectedClientId((prev) => prev || list[0].id);
    });
  }, []);

  useEffect(() => {
    if (active) setSelectedClientId(active.organizationId);
  }, [active]);

  async function handleStart() {
    if (!selectedClientId) {
      toast.error('Select a client first');
      return;
    }
    const result = await start(selectedClientId);
    if (!result.ok) toast.error(result.error);
  }

  async function handleStop() {
    const result = await stop();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Time entry saved as pending billable time');
  }

  return (
    <div className="fixed top-4 right-4 z-[150] bg-[#080E1A] border border-white/20 rounded-2xl shadow-2xl px-4 py-3 hidden md:flex items-center gap-3 font-mono text-xs">
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
