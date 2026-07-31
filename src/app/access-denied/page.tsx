'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

const ROLE_HOME: Record<string, string> = {
  OWNER: '/admin',
  OPERATOR: '/fulfillment',
  SALES: '/crm',
  CLIENT_OWNER: '/portal/dashboard',
  CLIENT_MEMBER: '/portal/dashboard',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  OPERATOR: 'Operator',
  SALES: 'Sales',
  CLIENT_OWNER: 'Client Owner',
  CLIENT_MEMBER: 'Client Member',
};

function AccessDeniedContent() {
  const params = useSearchParams();
  const router = useRouter();
  const attemptedPath = params.get('path') || 'this page';
  const role = params.get('role') || '';
  const roleLabel = ROLE_LABEL[role] || role || 'your account';
  const homePath = ROLE_HOME[role] || '/login';

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] top-1/4 left-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/80 border border-rose-500/30 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-rose-400" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-mono block">
            Access Denied — Elevation Required
          </span>
          <h1 className="text-xl font-black text-white tracking-tight">
            Your role can&apos;t open {attemptedPath}
          </h1>
          <p className="text-xs text-slate-400">
            You&apos;re signed in as <strong className="text-slate-200">{roleLabel}</strong>. This
            area needs a higher-access role. Ask an Owner to elevate your account if you need in.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => router.push(homePath)}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to your dashboard
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign in as someone else
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A]" />}>
      <AccessDeniedContent />
    </Suspense>
  );
}
