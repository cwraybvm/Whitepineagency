'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneCall,
  Star,
  Download,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_PRIMARY = '#0284C7'; // sky-600 — matches the pre-branding look

export default function ClientPortalDashboard() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetch('/api/portal/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBranding(data))
      .catch(() => {});
  }, []);

  const businessName = branding?.name || 'Apex Mechanical Services';
  const primaryColor = branding?.primaryColor || DEFAULT_PRIMARY;
  const logoUrl = branding?.logoUrl;

  return (
    // Primary color lands as a CSS custom property so any element on this
    // page can pick it up via var(--portal-primary) — buttons/highlights
    // below reference it directly instead of the old hardcoded sky-600.
    <div
      className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-100"
      style={{ ['--portal-primary' as string]: primaryColor }}
    >

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${businessName} logo`}
              className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-slate-700"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg"
              style={{ backgroundColor: 'var(--portal-primary)' }}
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span
              className="text-xs font-bold uppercase tracking-widest font-mono block flex items-center gap-1"
              style={{ color: 'var(--portal-primary)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> CLIENT SELF-SERVICE HUB
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {businessName}
            </h1>
            <p className="text-xs text-slate-400">
              AI Safety Net Active • Powered by White Pine Agency
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push('/portal/reviews')}
            className="px-4 py-2.5 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer hover:brightness-110"
            style={{ backgroundColor: 'var(--portal-primary)' }}
          >
            <Star className="w-3.5 h-3.5" /> Review Pass Sign
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl border-t-2"
          style={{ borderTopColor: 'var(--portal-primary)' }}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold font-mono uppercase">Captured Leads</span>
            <PhoneCall className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            38 <span className="text-xs text-slate-500 font-normal">this month</span>
          </div>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <ArrowUpRight className="w-3 h-3" /> 100% after-hours text response rate
          </p>
        </div>

        <div
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl border-t-2"
          style={{ borderTopColor: 'var(--portal-primary)' }}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold font-mono uppercase">Google Rating</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            4.9 <span className="text-xs text-slate-500 font-normal">(124 reviews)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            +14 new reviews from automated QR pass
          </p>
        </div>

        <div
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl border-t-2"
          style={{ borderTopColor: 'var(--portal-primary)' }}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold font-mono uppercase">Active Offer</span>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--portal-primary)' }} />
          </div>
          <div className="text-lg font-bold truncate" style={{ color: 'var(--portal-primary)' }}>
            $79 AC Tune-Up
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Auto-delivered in text-back sequences
          </p>
        </div>

      </div>

      {/* Recent Activity Log */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--portal-primary)' }} /> Recent Automated Lead Captures
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-white font-bold">(555) 987-6543 • Emergency AC Request</p>
              <span className="text-[10px] text-slate-500">Captured today at 6:42 PM (After Hours)</span>
            </div>
            <span className="text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold">
              Booked
            </span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-white font-bold">(555) 234-9911 • System Quote Inquiry</p>
              <span className="text-[10px] text-slate-500">Captured yesterday at 8:15 PM</span>
            </div>
            <span className="text-[10px] px-2 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md font-bold">
              Invoiced
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
