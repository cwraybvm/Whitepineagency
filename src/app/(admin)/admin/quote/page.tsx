'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';
import QuotingEngine from '@/components/QuotingEngine';

function QuotePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientName = searchParams.get('client') || 'Valued Client';
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-200 p-3 sm:p-4 flex flex-col items-center relative">
      <div className="cyber-grid absolute inset-0 -z-10 w-full h-full pointer-events-none opacity-20" />

      {/* Page Header */}
      <div className="max-w-4xl w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <button
          onClick={() => router.back()}
          className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl font-bold font-mono text-xs transition-all active:scale-95 cursor-pointer"
        >
          ← Back to Console
        </button>
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500">
          Standalone Proposal Engine
        </span>
        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-white rounded-xl font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer no-print flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" /> Print Quote
        </button>
      </div>

      {/* Main Quoting Engine Container */}
      <div className="max-w-4xl w-full">
        <QuotingEngine clientName={clientName} onCopySummary={handleShowToast} />
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white font-mono text-xs font-black uppercase px-6 py-3.5 rounded-2xl shadow-2xl animate-slideUp">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function StandaloneQuotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] flex items-center justify-center font-mono text-xs text-slate-400 animate-pulse">Loading Quote Engine...</div>}>
      <QuotePageContent />
    </Suspense>
  );
}