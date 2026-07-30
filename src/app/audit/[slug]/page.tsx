'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function ProspectAuditPage() {
  const params = useParams();
  const rawSlug = (params.slug as string) || 'local-business';
  
  // Format slug (e.g. "apex-mechanical" -> "Apex Mechanical")
  const businessName = rawSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [claimed, setClaimed] = useState(false);
  const [phone, setPhone] = useState('');

  const handleClaimOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter a phone number so we can activate your account.');
      return;
    }
    setClaimed(true);
    toast.success('Setup requested! We will text your login details shortly.');
  };

  return (
    <div className="min-h-screen bg-[#0E131F] text-[#E2E8F0] font-sans p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-[#171F2E] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
        
        {/* Top Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-6">
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest inline-block">
            COMPLIMENTARY LOCAL VISIBILITY REPORT
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {businessName}
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            We analyzed your local Google profile and customer response speed against top local competitors.
          </p>
        </div>

        {/* Audit Score Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-2xl text-center space-y-1">
            <span className="text-2xl font-black text-emerald-400">4.8 ⭐</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Google Rating</span>
            <span className="text-[9px] text-emerald-400">Top 10% in Area</span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-2xl text-center space-y-1">
            <span className="text-2xl font-black text-amber-400">12m ⏱️</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Lead Response Time</span>
            <span className="text-[9px] text-amber-400">Opportunity to Improve</span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-2xl text-center space-y-1">
            <span className="text-2xl font-black text-rose-400">~15/mo</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Missed Calls</span>
            <span className="text-[9px] text-rose-400">After 5:00 PM</span>
          </div>
        </div>

        {/* Free Tool Upgrade Box */}
        <div className="bg-[#0E131F] border border-blue-500/30 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              FREE COMPLIMENTARY UPGRADE
            </span>
            <h3 className="text-lg font-bold text-white">
              Activate Your Free AI Call & Lead Safety Net
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We built a custom automated text-back system for <strong>{businessName}</strong>. Whenever someone calls after hours and gets voicemail, our system instantly texts them to capture the job before they call a competitor.
            </p>
          </div>

          {claimed ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-center text-xs font-bold space-y-1">
              <p>🎉 Request Received for {businessName}!</p>
              <p className="text-[10px] text-slate-400 font-normal">
                Our team is activating your custom text-back phone line. Check your phone ({phone}) for access.
              </p>
            </div>
          ) : (
            <form onSubmit={handleClaimOffer} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Enter your mobile number to receive the free login & setup link:
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Owner Cell Phone (555-000-0000)"
                  className="w-full bg-[#171F2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-lg min-h-[44px]"
              >
                ⚡ Claim My Free 14-Day AI Safety Net
              </button>
            </form>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="text-center text-[10px] text-slate-500 space-y-1">
          <p>No credit card required • 100% free setup for local contractors</p>
          <p>White Pine Agency • Local Business Automation Systems</p>
        </div>

      </div>
    </div>
  );
}