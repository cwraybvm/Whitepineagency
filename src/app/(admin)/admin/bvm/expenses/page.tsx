'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, Loader2, Car } from 'lucide-react';

interface MileageExpense {
  id: string;
  date: string;
  miles: number | null;
  amount: number;
  description: string | null;
  appointment: { clientName: string; date: string } | null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BvmExpensesPage() {
  const [expenses, setExpenses] = useState<MileageExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bvm/expenses')
      .then((res) => res.json())
      .then(setExpenses)
      .catch(() => toast.error('Failed to load mileage expenses'))
      .finally(() => setLoading(false));
  }, []);

  const monthKey = todayStr().slice(0, 7);
  const yearKey = todayStr().slice(0, 4);
  const monthTotal = useMemo(
    () => expenses.filter((e) => e.date.slice(0, 7) === monthKey).reduce((sum, e) => sum + e.amount, 0),
    [expenses, monthKey]
  );
  const yearTotal = useMemo(
    () => expenses.filter((e) => e.date.slice(0, 4) === yearKey).reduce((sum, e) => sum + e.amount, 0),
    [expenses, yearKey]
  );

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Mileage Expenses</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Business Mileage logged from BVM appointments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">This Month</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">${monthTotal.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase text-slate-500">This Year</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">${yearTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm">
            No mileage logged yet — log a trip from an appointment's "💰 Log Mileage Expense" button.
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => {
              const rate = e.miles ? e.amount / e.miles : 0;
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <Car className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{e.appointment?.clientName || e.description || 'Trip'}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {e.date.slice(0, 10)} · {e.miles?.toFixed(1)} mi · ${rate.toFixed(2)}/mi
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-400 tabular-nums">${e.amount.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
