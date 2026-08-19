'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Newspaper, Plus, X, Loader2, Pencil, Trash2, Calculator } from 'lucide-react';

interface Issue {
  id: string;
  issueName: string;
  deadlineDate: string;
  adSpaceGoal: number;
  adSpaceSold: number;
}

interface FunnelSnapshot {
  totalCalls: number;
  appointmentsScheduled: number;
  closedDeals: number;
}

const EMPTY_FORM = { issueName: '', deadlineDate: '', adSpaceGoal: '', adSpaceSold: '' };
const DEFAULT_APPTS_PER_DEAL = 3;
const DEFAULT_CALLS_PER_APPT = 20;

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr);
  const now = new Date();
  const ms = deadline.setHours(23, 59, 59, 999) - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [funnel, setFunnel] = useState<FunnelSnapshot | null>(null);
  const [avgDealValue, setAvgDealValue] = useState(500);

  function load() {
    setLoading(true);
    fetch('/api/bvm/issues')
      .then((res) => res.json())
      .then(setIssues)
      .catch(() => toast.error('Failed to load issues'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    fetch('/api/bvm/reports?range=monthly')
      .then((res) => res.json())
      .then((data) => setFunnel(data.funnel))
      .catch(() => {});
  }, []);

  const rates = useMemo(() => {
    const appointmentsPerDeal =
      funnel && funnel.closedDeals > 0 ? funnel.appointmentsScheduled / funnel.closedDeals : DEFAULT_APPTS_PER_DEAL;
    const callsPerAppointment =
      funnel && funnel.appointmentsScheduled > 0 ? funnel.totalCalls / funnel.appointmentsScheduled : DEFAULT_CALLS_PER_APPT;
    return { appointmentsPerDeal, callsPerAppointment };
  }, [funnel]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(i: Issue) {
    setEditingId(i.id);
    setForm({
      issueName: i.issueName,
      deadlineDate: i.deadlineDate.slice(0, 10),
      adSpaceGoal: String(i.adSpaceGoal),
      adSpaceSold: String(i.adSpaceSold),
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        issueName: form.issueName,
        deadlineDate: form.deadlineDate,
        adSpaceGoal: Number(form.adSpaceGoal) || 0,
        adSpaceSold: Number(form.adSpaceSold) || 0,
      };
      const res = await fetch('/api/bvm/issues', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? 'Issue updated' : 'Issue created');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Failed to save issue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return;
    setIssues((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/bvm/issues?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to delete issue');
      load();
    }
  }

  return (
    <div className="px-6 pb-6 pt-4 md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Issue Deadlines & Quotas</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Publication issues, ad space goals, and weekly run-rate targets</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Issue
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
        <Calculator className="w-4 h-4 text-sky-400 shrink-0" />
        <label className="text-[11px] font-mono uppercase text-slate-500">Avg $ per closed deal (run-rate assumption)</label>
        <input
          type="number"
          value={avgDealValue}
          onChange={(e) => setAvgDealValue(Number(e.target.value) || 0)}
          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : issues.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">No issues yet — add one above.</div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const days = daysUntil(issue.deadlineDate);
            const pct = issue.adSpaceGoal > 0 ? Math.round((issue.adSpaceSold / issue.adSpaceGoal) * 100) : 0;
            const remaining = Math.max(0, issue.adSpaceGoal - issue.adSpaceSold);
            const weeksLeft = Math.max(1, Math.ceil(Math.max(days, 0) / 7));
            const dealsNeeded = avgDealValue > 0 ? remaining / avgDealValue : 0;
            const appointmentsNeeded = dealsNeeded * rates.appointmentsPerDeal;
            const callsNeeded = appointmentsNeeded * rates.callsPerAppointment;
            const weeklyCalls = Math.ceil(callsNeeded / weeksLeft);
            const weeklyAppts = Math.ceil(appointmentsNeeded / weeksLeft);

            return (
              <div key={issue.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{issue.issueName}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Deadline {new Date(issue.deadlineDate).toLocaleDateString()} — {days >= 0 ? `${days} days left` : `${Math.abs(days)} days past`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(issue)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(issue.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>${issue.adSpaceSold.toLocaleString()} / ${issue.adSpaceGoal.toLocaleString()}</span>
                    <span className="text-emerald-400 font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>

                {remaining > 0 && days >= 0 && (
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg px-3 py-2 text-[11px] font-mono text-sky-300">
                    To close the ${remaining.toLocaleString()} gap in {weeksLeft} week{weeksLeft === 1 ? '' : 's'}: ~
                    <strong>{weeklyCalls} calls/week</strong> and ~<strong>{weeklyAppts} appointments/week</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{editingId ? 'Edit Issue' : 'New Issue'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Issue Name</label>
            <input required placeholder="October 2026" value={form.issueName} onChange={(e) => setForm((f) => ({ ...f, issueName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Ad Content Deadline</label>
            <input required type="date" value={form.deadlineDate} onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block">Ad Space Goal ($)</label>
                <input required type="number" value={form.adSpaceGoal} onChange={(e) => setForm((f) => ({ ...f, adSpaceGoal: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block">Amount Sold ($)</label>
                <input type="number" value={form.adSpaceSold} onChange={(e) => setForm((f) => ({ ...f, adSpaceSold: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Issue'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
