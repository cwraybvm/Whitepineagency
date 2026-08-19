'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Plus, X, Loader2 } from 'lucide-react';

interface BvmAddress {
  id: string;
  customerName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  publicationName: string | null;
  magazineZone: string | null;
  sentToBvm: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  customerName: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  publicationName: '',
  magazineZone: '',
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<BvmAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function loadAddresses() {
    setLoading(true);
    fetch('/api/bvm/addresses')
      .then((res) => res.json())
      .then(setAddresses)
      .catch(() => toast.error('Failed to load addresses'))
      .finally(() => setLoading(false));
  }

  useEffect(loadAddresses, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bvm/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Address added');
      setForm(EMPTY_FORM);
      setModalOpen(false);
      loadAddresses();
    } catch {
      toast.error('Failed to add address');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSent(address: BvmAddress) {
    setAddresses((prev) => prev.map((a) => (a.id === address.id ? { ...a, sentToBvm: !a.sentToBvm } : a)));
    try {
      const res = await fetch('/api/bvm/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: address.id, sentToBvm: !address.sentToBvm }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to update status');
      loadAddresses();
    }
  }

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">New Addresses</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Business addresses queued for BVM</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Address
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">No addresses yet — add one above.</div>
      ) : (
        <div className="space-y-2.5">
          {addresses.map((a) => (
            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{a.customerName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {a.street}, {a.city}, {a.state} {a.zip}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {a.phone || 'No phone'} · {a.publicationName || 'No publication'} {a.magazineZone ? `· ${a.magazineZone}` : ''}
                </p>
              </div>
              <button
                onClick={() => toggleSent(a)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase font-mono border ${
                  a.sentToBvm
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 text-slate-400 border-slate-700 hover:bg-white/10'
                }`}
              >
                {a.sentToBvm ? 'Sent to BVM' : 'Mark Sent'}
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">New Address</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input required placeholder="Apex Auto Repair" {...field('customerName')} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            <input required placeholder="123 Main St, Suite 400" {...field('street')} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="grid grid-cols-3 gap-2">
              <input required placeholder="Austin" {...field('city')} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              <input required placeholder="TX" {...field('state')} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              <input required placeholder="78701" {...field('zip')} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <input placeholder="(512) 555-0199" {...field('phone')} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="St. Charles Living" {...field('publicationName')} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Zone B - West County" {...field('magazineZone')} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Add Address'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
