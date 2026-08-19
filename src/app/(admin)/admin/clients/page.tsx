'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, Plus, X } from 'lucide-react';
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

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'CANCELED'];

function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ClientRow) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [enabledFeatures, setEnabledFeatures] = useState<Set<FeatureKey>>(new Set(FEATURE_KEYS));
  const [submitting, setSubmitting] = useState(false);

  function toggleFeature(feature: FeatureKey) {
    setEnabledFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    setSubmitting(true);
    try {
      const disabledFeatures = FEATURE_KEYS.filter((f) => !enabledFeatures.has(f));
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), status, disabledFeatures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');
      toast.success(`${data.name} added`);
      onCreated(data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-bold block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
              placeholder="e.g. Apex Plumbing"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-bold block">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-emerald-500"
              placeholder="e.g. apex-plumbing"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-bold block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-bold block">Features</label>
            <div className="flex flex-wrap gap-1.5">
              {FEATURE_KEYS.map((feature) => {
                const enabled = enabledFeatures.has(feature);
                return (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    aria-pressed={enabled}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
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
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : []))
      .then(setClients)
      .catch(() => setClients([]))
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Clients</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3 py-2 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onCreated={(c) => setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}

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
