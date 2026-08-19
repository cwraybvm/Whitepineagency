'use client';

import { useState } from 'react';
import { Loader2, Download, CheckCircle2, Search } from 'lucide-react';
import type { CompetitorAuditResult } from '@/lib/competitorAuditTypes';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function LeadMagnetWidget() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [audit, setAudit] = useState<CompetitorAuditResult | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const isEmailValid = email.trim() === '' || EMAIL_PATTERN.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim() || !EMAIL_PATTERN.test(email.trim())) return;

    setStatus('loading');
    setErrorMessage('');
    setAudit(null);

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), websiteUrl: websiteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAudit(data.audit ?? null);
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  async function downloadPdf() {
    if (!audit) return;
    setExportingPdf(true);
    try {
      const [{ pdf }, { default: CompetitorAuditPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/fulfillment/CompetitorAuditPdf'),
      ]);
      const name = audit.client.title || websiteUrl.trim();
      const blob = await pdf(<CompetitorAuditPdf businessName={name} data={audit} />).toBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-competitor-audit.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 font-sans text-slate-100 shadow-xl">
      <div className="mb-4">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Free Competitor Audit
        </span>
        <h2 className="text-lg font-black text-white mt-1">See how you stack up online</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your website and we&apos;ll scan it against your competitors for a free report.
        </p>
      </div>

      {status !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Your Website URL</label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              required
              className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 ${
                isEmailValid ? 'border-slate-800' : 'border-rose-500'
              }`}
            />
          </div>

          {status === 'error' && <p className="text-xs text-rose-400">{errorMessage}</p>}

          <button
            type="submit"
            disabled={status === 'loading' || !isEmailValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your market position...
              </>
            ) : (
              'Get Free Competitor Audit'
            )}
          </button>
        </form>
      )}

      {status === 'success' && (
        <div className="space-y-3 text-center py-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          {audit ? (
            <>
              <p className="text-sm font-bold text-white">Your report is ready!</p>
              <p className="text-xs text-slate-400">Download your free competitor audit below.</p>
              <button
                onClick={downloadPdf}
                disabled={exportingPdf}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingPdf ? 'Building PDF…' : 'Download PDF Report'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white">Thanks! We&apos;ve got your info.</p>
              <p className="text-xs text-slate-400">
                We couldn&apos;t finish your report right away — check your email, we&apos;ll follow up shortly.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
