'use client';

import { useEffect, useState } from 'react';
import { Key, Globe, Mail, Save, Lock, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import ClientSelector, { ClientProvider, useClientSelector } from '@/components/ClientSelector';

interface VaultCreds {
  mailchimpApiKey?: string;
  mailchimpListId?: string;
  wordpressUrl?: string;
  wordpressUsername?: string;
  wordpressAppPass?: string;
  webhookUrl?: string;
}

function VaultBody() {
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientSelector();
  const [creds, setCreds] = useState<VaultCreds>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedClientId) {
      setCreds({});
      return;
    }
    setLoading(true);
    fetch(`/api/clients/${selectedClientId}/vault`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setCreds(data || {}))
      .catch(() => setCreds({}))
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success(`Saved integration keys for ${selectedClient?.name || 'client'}`);
    } catch (err: any) {
      toast.error(err.message || 'Error saving credentials');
    } finally {
      setSaving(false);
    }
  }

  function field<K extends keyof VaultCreds>(key: K) {
    return {
      value: creds[key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCreds((c) => ({ ...c, [key]: e.target.value })),
    };
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Integration Keys & Vault</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Configuring API keys for:{' '}
            <strong className="text-emerald-300">{selectedClient?.name || 'Select a client'}</strong>
          </p>
        </div>
        <ClientSelector />
      </div>

      {!clientsLoading && !selectedClient ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">
          No clients yet — add one under Admin → Clients first.
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl font-mono text-xs">
          <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-white/10 pb-2">
              <Mail className="w-4 h-4" />
              <span className="uppercase text-[11px]">Mailchimp Email Blast Settings</span>
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 font-bold block text-[10px]">Mailchimp API Key *</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="e.g. 84930xxxxxxxxx-us19"
                  disabled={loading}
                  {...field('mailchimpApiKey')}
                  className="w-full bg-slate-950 border border-white/15 p-2.5 pl-8 text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 font-bold block text-[10px]">Audience List ID (List ID) *</label>
              <input
                type="text"
                placeholder="e.g. a1b2c3d4e5"
                disabled={loading}
                {...field('mailchimpListId')}
                className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold border-b border-white/10 pb-2">
              <Globe className="w-4 h-4" />
              <span className="uppercase text-[11px]">WordPress Blog Direct Publisher</span>
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 font-bold block text-[10px]">WordPress Site Domain URL</label>
              <input
                type="url"
                placeholder="e.g. https://client-site.org"
                disabled={loading}
                {...field('wordpressUrl')}
                className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-gray-400 font-bold block text-[10px]">WP Admin Username</label>
                <input
                  type="text"
                  placeholder="e.g. admin"
                  disabled={loading}
                  {...field('wordpressUsername')}
                  className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-bold block text-[10px]">Application Password</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  disabled={loading}
                  {...field('wordpressAppPass')}
                  className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-white/10 pb-2">
              <Webhook className="w-4 h-4" />
              <span className="uppercase text-[11px]">Outbound Webhook (Zapier / Make.com)</span>
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 font-bold block text-[10px]">Webhook Target URL</label>
              <input
                type="url"
                placeholder="e.g. https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx"
                disabled={loading}
                {...field('webhookUrl')}
                className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Integrations'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function VaultPage() {
  return (
    <ClientProvider>
      <VaultBody />
    </ClientProvider>
  );
}
