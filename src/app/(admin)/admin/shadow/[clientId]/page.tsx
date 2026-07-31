'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, ArrowLeft, Users, Star, ShieldCheck, Loader2 } from 'lucide-react';

interface ShadowClient {
  id: string;
  name: string;
  leadsCount: number;
  rating: number;
  retainerActive: boolean;
}

export default function ShadowPortalPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params.clientId as string) || 'unknown';

  const [client, setClient] = useState<ShadowClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/shadow/${clientId}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load account');
        const data = await res.json();
        if (!cancelled) setClient(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-200">
      {/* Sticky shadow-mode alert banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-bold font-mono">
          <Eye className="w-4 h-4" />
          ADMIN SHADOW MODE ACTIVE — Viewing Portal for Account ID: {clientId}
        </span>
        <button
          onClick={() => router.push('/fulfillment')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Fulfillment
        </button>
      </div>

      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading account…
          </div>
        ) : notFound || !client ? (
          <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 backdrop-blur-xl">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest font-mono block">
              ACCOUNT NOT FOUND
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">No organization matches this ID</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Account ID: {clientId}</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono block">
                SHADOW VIEW
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">{client.name}</h1>
              <p className="text-xs text-slate-400 font-mono">Account ID: {clientId}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" /> Captured Leads
                </span>
                <p className="text-3xl font-black text-white font-mono">{client.leadsCount}</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> Google Rating
                </span>
                <p className="text-3xl font-black text-white font-mono">
                  {client.rating.toFixed(1)} <span className="text-amber-400 text-xl">★</span>
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Retainer Status
                </span>
                <p
                  className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg inline-block border ${
                    client.retainerActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {client.retainerActive ? 'Active Retainer' : 'Inactive'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
