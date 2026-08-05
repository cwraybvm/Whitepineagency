'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Palette } from 'lucide-react';
import type { OrgBrand } from './types';
import { fetchJsonArray } from '@/lib/sandboxClientFetch';

interface BrandDna {
  brandVoice?: string | null;
  brandGuidelines?: string | null;
}

// A standalone brand-reference lookup — deliberately its own org picker
// rather than mirroring whichever org is selected inside a Draft Canvas
// panel. Each of the 6 tool panels holds its own independent organizationId
// state; syncing this HUD to "whatever's active" would mean lifting that
// state out of six separately-authored components for a status readout.
// Shows only real fields: Organization.primaryColor (the only color the
// data model has — no secondary) and brandVoice/brandGuidelines free text.
export default function BrandDnaHud() {
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [brandDna, setBrandDna] = useState<BrandDna | null>(null);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setBrandDna(null);
      return;
    }
    fetch(`/api/sandbox/brand?organizationId=${organizationId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setBrandDna)
      .catch(() => setBrandDna(null));
  }, [organizationId]);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const hasBrandDna = Boolean(brandDna?.brandVoice || brandDna?.brandGuidelines);

  return (
    <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest">Brand DNA</span>
      </div>

      <select
        value={organizationId}
        onChange={(e) => setOrganizationId(e.target.value)}
        className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200"
      >
        <option value="">No client selected</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>

      {selectedOrg && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <Palette className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            {selectedOrg.primaryColor ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                <span className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shrink-0" style={{ backgroundColor: selectedOrg.primaryColor }} />
                <span className="text-slate-600 dark:text-slate-300">{selectedOrg.primaryColor}</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">No color set</span>
            )}
          </div>

          <span
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
              hasBrandDna
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {hasBrandDna && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
            {hasBrandDna ? 'Brand DNA Active' : 'No Brand DNA Set'}
          </span>

          {hasBrandDna && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex-1 min-w-[200px] truncate">
              {brandDna?.brandVoice || brandDna?.brandGuidelines}
            </p>
          )}
        </>
      )}
    </div>
  );
}
