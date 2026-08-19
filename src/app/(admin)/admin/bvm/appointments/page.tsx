'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Loader2, CalendarClock, Send, ListPlus, FileText } from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  clientName: string;
  clientEmail: string | null;
  outcome: string;
  notes: string;
  followUp: string;
  syncToCalendar: boolean;
  inviteSentAt: string | null;
}

const EMPTY_FORM = {
  date: '',
  clientName: '',
  clientEmail: '',
  outcome: '',
  notes: '',
  followUp: '',
  syncToCalendar: false,
};

// Standardized outcomes -- keeps the funnel chart on the Reports subtab
// countable ("Closed" outcomes = closed deals) and drives the auto-action prompt.
const OUTCOME_SUGGESTIONS = [
  'Interested — Follow-up Needed',
  'Not Interested',
  'No Show',
  'Rescheduled',
  'Closed - Won',
];
const FOLLOW_UP_OUTCOME = 'Interested — Follow-up Needed';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AppointmentsPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [outcomeActionBusy, setOutcomeActionBusy] = useState<'task' | 'proposal' | null>(null);

  function loadMonth() {
    setLoading(true);
    fetch(`/api/bvm/appointments?month=${monthKey(cursor)}`)
      .then((res) => res.json())
      .then(setAppointments)
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false));
  }

  useEffect(loadMonth, [cursor]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bvm/appointments', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      if (!res.ok) throw new Error();
      const { appointment } = await res.json();
      toast.success('Appointment saved');
      setEditingId(appointment.id);
      loadMonth();
    } catch {
      toast.error('Failed to save appointment');
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite() {
    if (!editingId) return;
    setSendingInvite(true);
    try {
      const res = await fetch('/api/bvm/appointments/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast.success(`Calendar invite sent to ${form.clientEmail}`);
      loadMonth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleOutcomeAction(kind: 'task' | 'proposal') {
    setOutcomeActionBusy(kind);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      const title =
        kind === 'task'
          ? `Follow up with ${form.clientName || 'client'} (BVM appointment)`
          : `Draft proposal for ${form.clientName || 'client'} (BVM appointment)`;
      const res = await fetch('/api/focus-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueDate: dueDate.toISOString(), isImportant: kind === 'proposal' }),
      });
      if (!res.ok) throw new Error();
      toast.success(kind === 'task' ? 'Follow-up task created' : 'Proposal task created');
    } catch {
      toast.error('Failed to create task');
    } finally {
      setOutcomeActionBusy(null);
    }
  }

  function openModalForDay(dayStr: string) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: dayStr });
    setModalOpen(true);
  }

  function openModalForEdit(a: Appointment, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(a.id);
    setForm({
      date: a.date.slice(0, 10),
      clientName: a.clientName,
      clientEmail: a.clientEmail || '',
      outcome: a.outcome,
      notes: a.notes,
      followUp: a.followUp,
      syncToCalendar: a.syncToCalendar,
    });
    setModalOpen(true);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];

  const byDay: Record<string, Appointment[]> = {};
  for (const a of appointments) {
    const key = a.date.slice(0, 10);
    (byDay[key] ||= []).push(a);
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Appointments</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Month view — click a day to add, click a card to edit</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-white font-mono w-32 text-center">
            {firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-[10px] font-mono uppercase text-slate-500 text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((dayStr, i) =>
              dayStr ? (
                <button
                  key={dayStr}
                  onClick={() => openModalForDay(dayStr)}
                  className="min-h-[76px] rounded-lg border border-slate-800 hover:border-emerald-500/50 p-1.5 text-left flex flex-col gap-1"
                >
                  <span className="text-[10px] font-mono text-slate-500">{Number(dayStr.slice(-2))}</span>
                  {(byDay[dayStr] || []).slice(0, 2).map((a) => (
                    <span
                      key={a.id}
                      onClick={(e) => openModalForEdit(a, e)}
                      className="text-[9px] bg-emerald-500/15 text-emerald-300 rounded px-1 py-0.5 truncate hover:bg-emerald-500/30"
                    >
                      {a.clientName}
                    </span>
                  ))}
                  {(byDay[dayStr]?.length || 0) > 2 && (
                    <span className="text-[9px] text-slate-500">+{(byDay[dayStr]?.length || 0) - 2} more</span>
                  )}
                </button>
              ) : (
                <div key={`empty-${i}`} />
              )
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{editingId ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Date</label>
            <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Client</label>
            <input required placeholder="Client name" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Client Email</label>
            <input type="email" placeholder="client@example.com" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Outcome</label>
            <input
              list="bvm-outcome-suggestions"
              placeholder="e.g. Interested — Follow-up Needed"
              value={form.outcome}
              onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
            <datalist id="bvm-outcome-suggestions">
              {OUTCOME_SUGGESTIONS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>

            {form.outcome === FOLLOW_UP_OUTCOME && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <p className="text-xs text-amber-300 font-bold">Interested — take an action?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOutcomeAction('task')}
                    disabled={outcomeActionBusy !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    {outcomeActionBusy === 'task' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5" />}
                    Create Follow-up Task
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOutcomeAction('proposal')}
                    disabled={outcomeActionBusy !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    {outcomeActionBusy === 'proposal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Draft Proposal
                  </button>
                </div>
              </div>
            )}

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white resize-y" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Follow-up</label>
            <input placeholder="Next step" value={form.followUp} onChange={(e) => setForm((f) => ({ ...f, followUp: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="flex items-center gap-2 text-xs text-slate-300 pt-1">
              <input type="checkbox" checked={form.syncToCalendar} onChange={(e) => setForm((f) => ({ ...f, syncToCalendar: e.target.checked }))} className="accent-emerald-500" />
              <CalendarClock className="w-3.5 h-3.5" /> Sync to Google Calendar
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Appointment'}
              </button>
              <button
                type="button"
                onClick={sendInvite}
                disabled={!editingId || !form.clientEmail || sendingInvite}
                title={!editingId ? 'Save the appointment first' : !form.clientEmail ? 'Add a client email first' : 'Send calendar invite'}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-40"
              >
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ✉️ Send Calendar Invite Email
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
