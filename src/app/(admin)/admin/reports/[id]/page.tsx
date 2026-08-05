'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Settings } from 'lucide-react';

export default function Page() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [loadingLead, setLoadingLead] = useState(true);

  // Quick remote config inputs state matrix
  const [localName, setLocalName] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const [localLoss, setLocalLoss] = useState(2450);
  const [localRank, setLocalRank] = useState("4");
  const [targetKeyword, setTargetKeyword] = useState("plumbing near me");

  const [speedPass, setSpeedPass] = useState(false);
  const [mapsPass, setMapsPass] = useState(false);
  const [missedCallPass, setMissedCallPass] = useState(false);
  const [aiPass, setAiPass] = useState(false);
  const [formsPass, setFormsPass] = useState(false);

  useEffect(() => {
    fetch(`/api/leads?orgId=default-tenant-workspace`)
      .then((res) => res.json())
      .then((data) => {
        const leads = data.leads || data;
        const found = leads.find((l: any) => l.id === id);
        if (found) {
          setLocalName(found.businessName);
          setLocalUrl(found.url);
          setLocalLoss(found.estimatedLoss || 2450);
          setLocalRank(found.proximityLimit?.toString() || "4");
        }
      })
      .finally(() => setLoadingLead(false));
  }, [id]);

  const saveOperatorMatrixOverrides = async () => {
    setScanning(true);
    try {
      await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadId: id, 
          businessName: localName,
          url: localUrl,
          estimatedLoss: localLoss,
          scoreOverride: speedPass ? 85 : 35
        })
      });
      alert("✨ Operational telemetries pushed directly to client portal cache!");
    } catch (err) {
      alert("⚠️ Node dispatch write intercept failed.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-gray-200 font-mono text-xs p-3 sm:p-4 max-w-2xl mx-auto space-y-4 pt-4">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
          <Settings className="w-4 h-4" /> Private Node Operator Command
        </h1>
        <p className="text-slate-500 mt-1">Direct CRM parameters injection console panel. Affects public report context paths.</p>
      </div>

      <div className="space-y-4 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 p-3 sm:p-4 rounded-2xl">
        {loadingLead ? (
          <div className="space-y-4 animate-pulse">
            <div className="space-y-1">
              <span className="block h-2.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <span className="block h-11 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>
            <div className="space-y-1">
              <span className="block h-2.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
              <span className="block h-11 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="block h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <span className="block h-11 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
              </div>
              <div className="space-y-1">
                <span className="block h-2.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                <span className="block h-11 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="block h-2.5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center py-1.5 px-2">
                  <span className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                  <span className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
            <span className="block h-11 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-4" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Client Identity Name</label>
              <input type="text" value={localName} onChange={(e) => setLocalName(e.target.value)} className="w-full bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 p-3 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/80 transition-all duration-200" />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Audit Link Domain</label>
              <input type="text" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)} className="w-full bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 p-3 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/80 transition-all duration-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Maps Search Position</label>
                <input type="text" value={localRank} onChange={(e) => setLocalRank(e.target.value)} className="w-full bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 p-3 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/80 transition-all duration-200 tabular-nums" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Assigned Monthly Loss ($)</label>
                <input type="number" value={localLoss} onChange={(e) => setLocalLoss(Number(e.target.value))} className="w-full bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 p-3 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/80 transition-all duration-200 tabular-nums" />
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-3">
              <label className="text-[10px] text-slate-500 uppercase font-black block mb-2">Binary Performance Toggles</label>
              {[['Speed Pass Matrix', speedPass, setSpeedPass], ['Missed Call Catch Rule', missedCallPass, setMissedCallPass], ['AI Agent Socket Sync', aiPass, setAiPass]].map(([label, val, setVal]: any, i) => (
                <label key={i} className="flex justify-between items-center py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors px-2 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                  <input type="checkbox" checked={val} onChange={() => setVal(!val)} className="w-4 h-4 accent-indigo-500" />
                </label>
              ))}
            </div>

            <button onClick={saveOperatorMatrixOverrides} disabled={scanning} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 font-bold text-white rounded-xl uppercase tracking-widest mt-4 cursor-pointer transition-all shadow-xl">
              {scanning ? 'TRANSMITTING OVERRIDES...' : '🚀 DISPATCH UPDATES TO CLIENT PORTAL'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
