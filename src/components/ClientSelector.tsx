'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';

export interface ClientOption {
  id: string;
  name: string;
  status: string;
  slug: string;
}

interface ClientSelectorContextValue {
  clients: ClientOption[];
  loading: boolean;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  selectedClient: ClientOption | null;
}

const ClientSelectorContext = createContext<ClientSelectorContextValue | null>(null);

// Reactive client list + selection shared across a page (Studio, Vault, etc).
// Loads once from /api/clients; every consumer re-renders on selection change.
export function ClientProvider({
  children,
  initialClientId,
}: {
  children: React.ReactNode;
  // Preselects a client once the list loads (e.g. handed off from another
  // page via a ?client= query param) instead of always defaulting to the
  // alphabetically-first one.
  initialClientId?: string;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ClientOption[]) => {
        setClients(list);
        const preferred = initialClientId && list.some((c) => c.id === initialClientId) ? initialClientId : '';
        setSelectedClientId((prev) => prev || preferred || list[0]?.id || '');
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <ClientSelectorContext.Provider
      value={{ clients, loading, selectedClientId, setSelectedClientId, selectedClient }}
    >
      {children}
    </ClientSelectorContext.Provider>
  );
}

export function useClientSelector() {
  const ctx = useContext(ClientSelectorContext);
  if (!ctx) throw new Error('useClientSelector must be used within a ClientProvider');
  return ctx;
}

// Dropdown UI — must render inside a <ClientProvider>.
export default function ClientSelector({ className = '' }: { className?: string }) {
  const { clients, loading, selectedClientId, setSelectedClientId } = useClientSelector();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : (
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm max-w-[16rem]"
        >
          {clients.length === 0 && <option value="">No clients yet</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
