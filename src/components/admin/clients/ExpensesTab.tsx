'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Expense {
  id: string;
  type: string;
  amount: number;
  miles: number | null;
  category: string;
  receiptUrl: string | null;
  date: string;
}

function toCsv(rows: Expense[]): string {
  const header = 'Date,Type,Category,Amount,Miles,Receipt URL';
  const lines = rows.map((r) =>
    [
      new Date(r.date).toLocaleDateString(),
      r.type,
      r.category,
      r.amount.toFixed(2),
      r.miles ?? '',
      r.receiptUrl ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export default function ExpensesTab({ clientId }: { clientId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<'EXPENSE' | 'MILEAGE'>('EXPENSE');
  const [amount, setAmount] = useState(0);
  const [miles, setMiles] = useState(0);
  const [category, setCategory] = useState('General');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/expenses`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load expenses');
        return res.json();
      })
      .then(setExpenses)
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    }
    return Array.from(totals.entries());
  }, [expenses]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount, miles: type === 'MILEAGE' ? miles : undefined, category, receiptUrl, date }),
      });
      if (!res.ok) throw new Error('Failed to save expense');
      toast.success('Expense added');
      setModalOpen(false);
      setAmount(0);
      setMiles(0);
      setReceiptUrl('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/clients/${clientId}/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete expense');
      return;
    }
    load();
  }

  function handleExport() {
    const csv = toCsv(expenses);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${clientId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Quick Add
        </button>
        <button
          onClick={handleExport}
          disabled={expenses.length === 0}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([cat, total]) => (
            <div key={cat} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-gray-400">{cat}: </span>
              <span className="text-white font-medium">${total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Miles</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-gray-300">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-300">{e.type}</td>
                  <td className="p-3 text-gray-300">{e.category}</td>
                  <td className="p-3 text-right text-white">${e.amount.toFixed(2)}</td>
                  <td className="p-3 text-right text-gray-400">{e.miles ?? '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(e.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">Quick Add</span>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('EXPENSE')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'EXPENSE' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'}`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setType('MILEAGE')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'MILEAGE' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'}`}
                >
                  Mileage
                </button>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              {type === 'MILEAGE' && (
                <input
                  type="number"
                  step="0.1"
                  value={miles}
                  onChange={(e) => setMiles(Number(e.target.value))}
                  placeholder="Miles"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              )}
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Amount ($)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="Receipt URL (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
