'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Loader2,
  Send,
  Eye,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  FileText,
} from 'lucide-react';

type HealthScore = 'Healthy' | 'Warning' | 'Churn Risk';

interface ClientHealth {
  organizationId: string;
  organizationName: string;
  planName: string | null;
  subscriptionStatus: string;
  mrr: number;
  lastLoginAt: string | null;
  slaPassRate: number | null;
  activeLeadVolume: number;
  healthScore: HealthScore;
  contactEmail: string | null;
}

interface RevenueMetrics {
  totalMrr: number;
  mrrGrowthPct: number | null;
  activeRetainers: number;
  avgRetainerValue: number;
}

const HEALTH_STYLE: Record<HealthScore, { text: string; bg: string; border: string; icon: typeof ShieldCheck }> = {
  Healthy: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: ShieldCheck },
  Warning: { text: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: AlertTriangle },
  'Churn Risk': { text: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30', icon: ShieldAlert },
};

function formatRelativeLogin(iso: string | null): string {
  if (!iso) return 'Never logged in';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function RevenuePage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [clients, setClients] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [outreachSendingId, setOutreachSendingId] = useState<string | null>(null);
  const [reportSendingId, setReportSendingId] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch(`/api/revenue?t=${Date.now()}`, { cache: 'no-store' });
      if (res.status === 403 || res.status === 401) {
        setDenied(true);
        return;
      }
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setMetrics(data.metrics);
      setClients(data.clients || []);
    } catch {
      toast.error('Failed to load revenue radar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const triggerOutreach = async (client: ClientHealth) => {
    if (!client.contactEmail) {
      toast.error(`No contact email on file for "${client.organizationName}"`);
      return;
    }
    setOutreachSendingId(client.organizationId);

    try {
      const res = await fetch('/api/leads/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.contactEmail,
          subject: `Checking in — ${client.organizationName}`,
          body:
            `Hi ${client.organizationName} team,\n\n` +
            `Wanted to check in and see how things are going with your account. ` +
            `Let us know if there's anything we can help with or any questions on your setup.\n\n` +
            `— White Pine Agency`,
        }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      toast.success(`Outreach sent to "${client.organizationName}"`);
    } catch {
      toast.error(`Failed to send outreach to "${client.organizationName}"`);
    } finally {
      setOutreachSendingId(null);
    }
  };

  const sendMonthlyReport = async (client: ClientHealth) => {
    setReportSendingId(client.organizationId);
    try {
      const res = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: client.organizationId, dispatch: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dispatch failed');
      toast.success(data.emailed ? `ROI report emailed to "${client.organizationName}"` : `Report generated for "${client.organizationName}" (no email on file)`);
    } catch (err: any) {
      toast.error(err.message || `Failed to send ROI report to "${client.organizationName}"`);
    } finally {
      setReportSendingId(null);
    }
  };

  const growthPositive = (metrics?.mrrGrowthPct ?? 0) >= 0;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-6">
        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> AGENCY OPERATIONAL MATRIX
        </span>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Revenue &amp; Retainer Health Radar</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Live MRR, retainer health, and churn-risk signals across every client account.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 dark:text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading revenue data from database…
        </div>
      ) : denied ? (
        <div className="max-w-md mx-auto bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-rose-500/30 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-8 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-500 dark:text-rose-400" />
          </div>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest font-mono block">
            Access Denied — Elevation Required
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Owner access required</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Revenue and retainer financials are restricted to the Owner role. Ask an Owner to
            elevate your account if you need visibility here.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign in as someone else
          </button>
        </div>
      ) : (
        <>
          {/* Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-5 space-y-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono uppercase flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Total MRR
              </span>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  ${metrics!.totalMrr.toLocaleString()}
                </p>
                {metrics!.mrrGrowthPct !== null && (
                  <span
                    className={`text-xs font-bold font-mono flex items-center gap-0.5 ${
                      growthPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {growthPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {growthPositive ? '+' : ''}
                    {metrics!.mrrGrowthPct}%
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-600 font-mono">
                {metrics!.mrrGrowthPct === null ? 'Not enough history for MoM yet' : 'vs. 30 days ago'}
              </p>
            </div>

            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-5 space-y-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Active Retainers
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">{metrics!.activeRetainers}</p>
            </div>

            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-5 space-y-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono uppercase flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Avg. Retainer Value
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                ${metrics!.avgRetainerValue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Health Score Radar Table */}
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Client Health Radar
              </h2>
            </div>

            {clients.length === 0 ? (
              <div className="p-8 text-center text-[11px] text-slate-500 dark:text-slate-600 font-mono">
                No retainer clients yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 font-mono uppercase">
                      <th className="text-left p-3">Client</th>
                      <th className="text-left p-3">MRR</th>
                      <th className="text-left p-3">Last Login</th>
                      <th className="text-left p-3">SLA Pass Rate</th>
                      <th className="text-left p-3">Leads (30d)</th>
                      <th className="text-left p-3">Health</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => {
                      const h = HEALTH_STYLE[client.healthScore];
                      const HealthIcon = h.icon;
                      return (
                        <tr
                          key={client.organizationId}
                          className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3">
                            <p className="font-bold text-slate-900 dark:text-white">{client.organizationName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{client.planName || 'No active plan'}</p>
                          </td>
                          <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ${client.mrr.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                            {formatRelativeLogin(client.lastLoginAt)}
                          </td>
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                            {client.slaPassRate === null ? 'N/A' : `${client.slaPassRate}%`}
                          </td>
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{client.activeLeadVolume}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] border flex items-center gap-1 w-fit ${h.bg} ${h.text} ${h.border}`}
                            >
                              <HealthIcon className="w-3 h-3" /> {client.healthScore}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => triggerOutreach(client)}
                                disabled={outreachSendingId === client.organizationId}
                                title="Send quick outreach email"
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                              >
                                {outreachSendingId === client.organizationId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Outreach
                              </button>
                              <button
                                onClick={() => sendMonthlyReport(client)}
                                disabled={reportSendingId === client.organizationId}
                                title="Generate & email the monthly ROI report"
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                              >
                                {reportSendingId === client.organizationId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <FileText className="w-3 h-3" />
                                )}
                                ROI Report
                              </button>
                              <button
                                onClick={() => router.push(`/admin/shadow/${client.organizationId}`)}
                                title="Open Client Shadow Portal"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                              >
                                <Eye className="w-3 h-3" /> Shadow
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
