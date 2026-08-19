'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wallet, Loader2, Car, Receipt, Plus, X, Camera, Download } from 'lucide-react';
import { readFileAsDataUrl, MAX_PHOTO_BYTES } from '@/lib/photoAttachment';
import { IRS_MILEAGE_RATE } from '@/lib/bvmTargets';

interface Expense {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  miles: number | null;
  description: string | null;
  receiptUrl: string | null;
  appointment: { clientName: string; date: string } | null;
}

const CATEGORY_SUGGESTIONS = ['Office Supplies', 'Meals & Entertainment', 'Software & Subscriptions', 'Travel', 'Postage & Shipping', 'General'];

const EMPTY_EXPENSE_FORM = {
  date: '',
  category: '',
  description: '',
  amount: '',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BvmExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_EXPENSE_FORM, date: todayStr() });
  const [newReceiptDataUrl, setNewReceiptDataUrl] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [attachingReceiptId, setAttachingReceiptId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState<'ytd' | 'month' | 'custom'>('ytd');
  const [exportMonth, setExportMonth] = useState(todayStr().slice(0, 7));
  const [exportStart, setExportStart] = useState(todayStr());
  const [exportEnd, setExportEnd] = useState(todayStr());
  const [exporting, setExporting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function loadExpenses() {
    setLoading(true);
    fetch('/api/bvm/expenses')
      .then((res) => res.json())
      .then(setExpenses)
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  }

  useEffect(loadExpenses, []);

  const monthKey = todayStr().slice(0, 7);
  const yearKey = todayStr().slice(0, 4);
  const mileageRows = useMemo(() => expenses.filter((e) => e.type === 'MILEAGE'), [expenses]);
  const directRows = useMemo(() => expenses.filter((e) => e.type !== 'MILEAGE'), [expenses]);

  const monthMiles = useMemo(
    () => mileageRows.filter((e) => e.date.slice(0, 7) === monthKey).reduce((sum, e) => sum + (e.miles || 0), 0),
    [mileageRows, monthKey]
  );
  const ytdMiles = useMemo(
    () => mileageRows.filter((e) => e.date.slice(0, 4) === yearKey).reduce((sum, e) => sum + (e.miles || 0), 0),
    [mileageRows, yearKey]
  );
  const ytdMileageDeduction = useMemo(
    () => mileageRows.filter((e) => e.date.slice(0, 4) === yearKey).reduce((sum, e) => sum + e.amount, 0),
    [mileageRows, yearKey]
  );
  const ytdDirectExpenses = useMemo(
    () => directRows.filter((e) => e.date.slice(0, 4) === yearKey).reduce((sum, e) => sum + e.amount, 0),
    [directRows, yearKey]
  );
  const ytdCombined = ytdMileageDeduction + ytdDirectExpenses;

  async function attachReceiptFile(expenseId: string, file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo too large — keep it under 2MB');
      return;
    }
    setAttachingReceiptId(expenseId);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch('/api/bvm/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expenseId, receiptUrl: dataUrl }),
      });
      if (!res.ok) throw new Error();
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? { ...e, receiptUrl: dataUrl } : e)));
      toast.success('Receipt attached');
    } catch {
      toast.error('Failed to attach receipt');
    } finally {
      setAttachingReceiptId(null);
    }
  }

  async function handleNewReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo too large — keep it under 2MB');
      return;
    }
    try {
      setNewReceiptDataUrl(await readFileAsDataUrl(file));
    } catch {
      toast.error('Failed to read photo');
    }
  }

  async function saveNewExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingExpense(true);
    try {
      const res = await fetch('/api/bvm/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), receiptUrl: newReceiptDataUrl }),
      });
      if (!res.ok) throw new Error();
      toast.success('Expense logged');
      setAddModalOpen(false);
      setForm({ ...EMPTY_EXPENSE_FORM, date: todayStr() });
      setNewReceiptDataUrl(null);
      loadExpenses();
    } catch {
      toast.error('Failed to log expense');
    } finally {
      setSavingExpense(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ range: exportRange });
      if (exportRange === 'month') params.set('month', exportMonth);
      if (exportRange === 'custom') {
        params.set('start', exportStart);
        params.set('end', exportEnd);
      }
      const res = await fetch(`/api/bvm/expenses/export?${params.toString()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bvm-expense-tax-summary-${exportRange}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Tax CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">BVM Expenses</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Mileage &amp; direct business expenses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">Miles Driven</p>
          <p className="text-lg font-bold text-white mt-1 tabular-nums">{monthMiles.toFixed(1)} mo</p>
          <p className="text-xs text-slate-400 tabular-nums">{ytdMiles.toFixed(1)} YTD</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">IRS Mileage Deduction</p>
          <p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">${ytdMileageDeduction.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">YTD @ ${IRS_MILEAGE_RATE.toFixed(2)}/mi</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">Direct Expenses</p>
          <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">${ytdDirectExpenses.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">YTD</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">Est. Tax Deduction</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">${ytdCombined.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">YTD combined</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Export Tax Summary</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(['ytd', 'month', 'custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setExportRange(r)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold uppercase ${
                exportRange === r ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {r === 'ytd' ? 'Year to Date' : r}
            </button>
          ))}
          {exportRange === 'month' && (
            <input
              type="month"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          )}
          {exportRange === 'custom' && (
            <>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </>
          )}
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 rounded-xl disabled:opacity-50 ml-auto"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            📥 Export Tax CSV
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm">
            No expenses logged yet — add one above, or log a trip from an appointment's "💰 Log Mileage Expense" button.
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => {
              const rate = e.type === 'MILEAGE' && e.miles ? e.amount / e.miles : 0;
              const label = e.appointment?.clientName || e.description || (e.type === 'MILEAGE' ? 'Trip' : e.category);
              return (
                <div key={e.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                  {e.type === 'MILEAGE' ? <Car className="w-4 h-4 text-sky-400 shrink-0" /> : <Receipt className="w-4 h-4 text-amber-400 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{label}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {e.date.slice(0, 10)} · {e.category}
                      {e.type === 'MILEAGE' && e.miles ? ` · ${e.miles.toFixed(1)} mi · $${rate.toFixed(2)}/mi` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-400 tabular-nums">${e.amount.toFixed(2)}</span>
                  {e.receiptUrl ? (
                    <img
                      src={e.receiptUrl}
                      alt="Receipt"
                      onClick={() => setLightboxUrl(e.receiptUrl)}
                      className="shrink-0 w-11 h-11 rounded-lg object-cover border border-slate-800 cursor-pointer"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => fileInputRefs.current[e.id]?.click()}
                        disabled={attachingReceiptId === e.id}
                        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-50"
                        title="📸 Attach Receipt Photo"
                      >
                        {attachingReceiptId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[e.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          ev.target.value = '';
                          if (file) attachReceiptFile(e.id, file);
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="Receipt full size" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAddModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={saveNewExpense}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Add Expense</h2>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Date</label>
            <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Category</label>
            <input
              list="bvm-expense-categories"
              placeholder="e.g. Office Supplies"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
            <datalist id="bvm-expense-categories">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Description</label>
            <input
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Amount ($)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-3 rounded-lg cursor-pointer">
              <Camera className="w-3.5 h-3.5" /> 📸 Attach Receipt Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNewReceiptChange} />
            </label>
            {newReceiptDataUrl && (
              <img src={newReceiptDataUrl} alt="Receipt preview" className="w-full max-h-40 object-cover rounded-lg border border-slate-800" />
            )}

            <button
              type="submit"
              disabled={savingExpense}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {savingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {savingExpense ? 'Saving…' : 'Log Expense'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
