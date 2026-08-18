'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from '@/config/tenantFeatures';

interface ClientRow {
  id: string;
  name: string;
  status: string;
  slug: string;
  primaryColor: string | null;
  disabledFeatures: string[];
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load clients');
        return res.json();
      })
      .then(setClients)
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleFeature(client: ClientRow, feature: FeatureKey) {
    const isDisabled = client.disabledFeatures.includes(feature);
    const nextDisabled = isDisabled
      ? client.disabledFeatures.filter((f) => f !== feature)
      : [...client.disabledFeatures, feature];

    const prevClients = clients;
    setClients((cs) => cs.map((c) => (c.id === client.id ? { ...c, disabledFeatures: nextDisabled } : c)));
    setSavingId(client.id);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledFeatures: nextDisabled }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      setClients(prevClients);
      toast.error(`Failed to update ${FEATURE_LABELS[feature]} for ${client.name}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="px-6 pb-6 pt-[calc(max(24px,env(safe-area-inset-top))+8px)] md:px-8 md:pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold text-white">Clients</h1>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Color</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Features</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 align-top">
                  <td className="p-3 whitespace-nowrap">
                    <Link href={`/admin/clients/${c.id}`} className="text-emerald-400 hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-xs whitespace-nowrap">{c.slug}</td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: c.primaryColor || '#334155' }}
                      />
                      <span className="text-gray-400 font-mono text-xs">{c.primaryColor || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{c.status}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {FEATURE_KEYS.map((feature) => {
                        const enabled = !c.disabledFeatures.includes(feature);
                        return (
                          <button
                            key={feature}
                            type="button"
                            disabled={savingId === c.id}
                            onClick={() => toggleFeature(c, feature)}
                            aria-pressed={enabled}
                            title={`${FEATURE_LABELS[feature]}: ${enabled ? 'enabled' : 'disabled'} — click to toggle`}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                              enabled
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                            }`}
                          >
                            {FEATURE_LABELS[feature]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
