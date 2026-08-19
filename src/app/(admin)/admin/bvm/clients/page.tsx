'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KanbanSquare, Plus, Loader2, AlertTriangle } from 'lucide-react';

interface KanbanClient {
  id: string;
  clientName: string;
  stage: string;
  lastContacted: string | null;
  nextContacted: string | null;
  contactNotes: string;
  contactName: string | null;
  addressId: string | null;
}

interface AddressOption {
  id: string;
  customerName: string;
  street: string;
  city: string;
}

const STAGES = ['Lead', 'First Contact', 'Appointment Set', 'Closed/Won', 'Follow-up Needed'];
const STALE_DAYS = 14;

function isStale(lastContacted: string | null): boolean {
  if (!lastContacted) return false;
  const days = (Date.now() - new Date(lastContacted).getTime()) / (1000 * 60 * 60 * 24);
  return days > STALE_DAYS;
}

export default function ClientKanbanPage() {
  const [clients, setClients] = useState<KanbanClient[]>([]);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanClient | null>(null);

  function load() {
    setLoading(true);
    fetch('/api/bvm/clients')
      .then((res) => res.json())
      .then(setClients)
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    fetch('/api/bvm/addresses')
      .then((res) => res.json())
      .then((data: AddressOption[]) => setAddresses(data.map((a) => ({ id: a.id, customerName: a.customerName, street: a.street, city: a.city }))))
      .catch(() => {});
  }, []);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/bvm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: newName.trim(), stage: 'Lead' }),
      });
      if (!res.ok) throw new Error();
      setNewName('');
      load();
    } catch {
      toast.error('Failed to add client');
    }
  }

  async function updateClient(id: string, patch: Partial<KanbanClient>) {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      const res = await fetch('/api/bvm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to update client');
      load();
    }
  }

  function onDrop(stage: string) {
    if (dragId) updateClient(dragId, { stage });
    setDragId(null);
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Client Kanban</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Drag cards between stages</p>
        </div>
        <form onSubmit={addClient} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New client name"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white w-48"
          />
          <button type="submit" className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto snap-x snap-mandatory md:snap-none no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
          {STAGES.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3 min-h-[200px] flex flex-col gap-2 w-[85vw] sm:w-80 md:w-auto shrink-0 md:shrink snap-center md:snap-align-none"
            >
              <h3 className="text-[11px] font-mono uppercase text-slate-400 font-bold px-1">
                {stage} <span className="text-slate-600">({clients.filter((c) => c.stage === stage).length})</span>
              </h3>
              {clients
                .filter((c) => c.stage === stage)
                .map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onClick={() => setActiveCard(c)}
                    className={`bg-slate-950 border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/40 ${
                      isStale(c.lastContacted) ? 'border-red-500/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">{c.clientName}</p>
                      {isStale(c.lastContacted) && (
                        <span className="shrink-0 flex items-center gap-1 bg-red-500/20 text-red-300 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" /> Stale
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Last: {c.lastContacted ? c.lastContacted.slice(0, 10) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Next: {c.nextContacted ? c.nextContacted.slice(0, 10) : '—'}
                    </p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setActiveCard(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{activeCard.clientName}</h2>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Stage</label>
            <select
              value={activeCard.stage}
              onChange={(e) => {
                updateClient(activeCard.id, { stage: e.target.value });
                setActiveCard((c) => (c ? { ...c, stage: e.target.value } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Last Contacted</label>
            <input
              type="date"
              value={activeCard.lastContacted?.slice(0, 10) || ''}
              onChange={(e) => {
                updateClient(activeCard.id, { lastContacted: e.target.value || null });
                setActiveCard((c) => (c ? { ...c, lastContacted: e.target.value || null } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Next Contact</label>
            <input
              type="date"
              value={activeCard.nextContacted?.slice(0, 10) || ''}
              onChange={(e) => {
                updateClient(activeCard.id, { nextContacted: e.target.value || null });
                setActiveCard((c) => (c ? { ...c, nextContacted: e.target.value || null } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Notes</label>
            <textarea
              rows={4}
              value={activeCard.contactNotes}
              onChange={(e) => {
                updateClient(activeCard.id, { contactNotes: e.target.value });
                setActiveCard((c) => (c ? { ...c, contactNotes: e.target.value } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white resize-y"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Contact Name</label>
            <input
              value={activeCard.contactName || ''}
              onChange={(e) => {
                updateClient(activeCard.id, { contactName: e.target.value });
                setActiveCard((c) => (c ? { ...c, contactName: e.target.value } : c));
              }}
              placeholder="Primary contact"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Linked Address</label>
            <select
              value={activeCard.addressId || ''}
              onChange={(e) => {
                const addressId = e.target.value || null;
                updateClient(activeCard.id, { addressId });
                setActiveCard((c) => (c ? { ...c, addressId } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">— No address linked —</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.customerName} — {a.street}, {a.city}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">Linking an address makes this client available in Drop-Off Route.</p>

            <button onClick={() => setActiveCard(null)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-4 py-2.5 rounded-xl mt-1">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
