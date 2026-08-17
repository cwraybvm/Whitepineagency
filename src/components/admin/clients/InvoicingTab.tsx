'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface BillableLine {
  timeEntryId: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface BillablePreview {
  rate: number;
  totalHours: number;
  totalAmount: number;
  lines: BillableLine[];
}

export default function InvoicingTab({ clientId }: { clientId: string }) {
  const [preview, setPreview] = useState<BillablePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/admin/invoices/generate?organizationId=${clientId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load unbilled time');
        return res.json();
      })
      .then(setPreview)
      .catch(() => toast.error('Failed to load unbilled time'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invoice');
      toast.success(`Invoice generated for $${data.totalAmount.toFixed(2)}`);
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
  }

  const hasUnbilled = (preview?.lines.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <span className="text-xs text-gray-400 block">Unbilled Hours</span>
          <span className="text-lg font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" /> {preview?.totalHours.toFixed(2) ?? '0.00'}
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <span className="text-xs text-gray-400 block">Billable Amount</span>
          <span className="text-lg font-bold text-white">${preview?.totalAmount.toFixed(2) ?? '0.00'}</span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!hasUnbilled}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all ml-auto"
        >
          <FileText className="w-4 h-4" /> Generate Invoice from Unbilled Time
        </button>
      </div>

      <div className="border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
            <tr>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Hours</th>
              <th className="text-right p-3">Rate</th>
              <th className="text-right p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {preview?.lines.map((line) => (
              <tr key={line.timeEntryId} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-3 text-gray-300">{line.description}</td>
                <td className="p-3 text-right text-gray-300">{line.hours.toFixed(2)}</td>
                <td className="p-3 text-right text-gray-400">${line.rate.toFixed(2)}</td>
                <td className="p-3 text-right text-white">${line.amount.toFixed(2)}</td>
              </tr>
            ))}
            {!hasUnbilled && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No unbilled time entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">Generate Invoice</span>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-400">
                This will bill {preview?.lines.length ?? 0} unbilled time {preview?.lines.length === 1 ? 'entry' : 'entries'} ({preview?.totalHours.toFixed(2)} hrs) at ${preview?.rate.toFixed(2)}/hr, totaling{' '}
                <span className="text-white font-semibold">${preview?.totalAmount.toFixed(2)}</span>.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
