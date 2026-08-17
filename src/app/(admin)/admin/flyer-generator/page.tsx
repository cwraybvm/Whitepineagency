'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

export default function FlyerGeneratorPage() {
  const [businessName, setBusinessName] = useState('Apex Mechanical Services');
  const [phone, setPhone] = useState('(555) 234-5678');
  const [offerHeadline, setOfferHeadline] = useState('$79 Seasonal AC Tune-Up');
  const [offerSubtext, setOfferSubtext] = useState(
    'Includes 21-point system inspection, safety check, and refrigerant top-off. New residential clients only.'
  );
  const [expirationDate, setExpirationDate] = useState('August 31, 2026');
  const [accentColor, setAccentColor] = useState('#0369A1'); // Matches your --color-accent

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDesignDetails = () => {
    const details = `Business: ${businessName}\nOffer: ${offerHeadline}\nDetails: ${offerSubtext}\nExpires: ${expirationDate}\nPhone: ${phone}`;
    navigator.clipboard.writeText(details);
    toast.success('Flyer details copied to clipboard!');
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Print-Only Flyer Output (Only displays when printing/saving as PDF) */}
      <div className="hidden print:block w-[8.5in] h-[11in] mx-auto p-12 bg-white text-slate-900 font-sans flex-col justify-between border-8 border-slate-900">

        {/* Print Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-block px-6 py-2 text-white font-black text-xl uppercase tracking-widest rounded-lg"
            style={{ backgroundColor: accentColor }}
          >
            LIMITED TIME SPECIAL OFFER
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 uppercase">
            {businessName}
          </h1>
          <p className="text-lg font-bold text-slate-600">Licensed • Insured • Local Experts</p>
        </div>

        {/* Big Offer Box */}
        <div className="my-8 p-10 border-4 border-dashed border-slate-900 rounded-3xl text-center space-y-6 bg-slate-50">
          <h2
            className="text-6xl font-black uppercase tracking-tight"
            style={{ color: accentColor }}
          >
            {offerHeadline}
          </h2>
          <p className="text-xl font-medium text-slate-700 max-w-2xl mx-auto leading-relaxed">
            {offerSubtext}
          </p>
          <div className="pt-4 border-t-2 border-slate-300 flex justify-between items-center text-sm font-bold text-slate-500 uppercase">
            <span>Promo Code: SPECIAL79</span>
            <span>Expires: {expirationDate}</span>
          </div>
        </div>

        {/* Call to Action Footer */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold text-slate-800">Call Today to Schedule Your Appointment!</h3>
          <div
            className="text-5xl font-black font-mono py-4 text-white rounded-2xl shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            📞 {phone}
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest pt-4">
            {businessName} • Quality Service Guaranteed
          </p>
        </div>

      </div>

      {/* Screen Interface (Hidden when printing) */}
      <div className="no-print space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1E293B] border border-slate-700/60 rounded-2xl p-6 shadow-lg">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block">
              TIER 2 • CREATIVE FULFILLMENT
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Client Offer & Flyer Generator
            </h1>
            <p className="text-xs text-slate-400">
              Customize client offers in real time and generate print-ready PDFs or digital promo cards.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyDesignDetails}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95"
            >
              📋 Copy Details
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              🖨️ Export / Print PDF
            </button>
          </div>
        </div>

        {/* Generator Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Controls Column */}
          <div className="lg:col-span-5 bg-[#1E293B] border border-slate-700/60 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-700/60 pb-3">
              ⚙️ Flyer Customization Parameters
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Main Offer Headline</label>
                <input
                  type="text"
                  value={offerHeadline}
                  onChange={(e) => setOfferHeadline(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Offer Description / Fine Print</label>
                <textarea
                  rows={3}
                  value={offerSubtext}
                  onChange={(e) => setOfferSubtext(e.target.value)}
                  className="w-full bg-[#0F1F2A] border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Expiration Date</label>
                  <input
                    type="text"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Brand Accent Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-9 bg-transparent cursor-pointer rounded-lg border border-slate-700"
                    />
                    <span className="text-xs font-mono text-slate-400">{accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Digital Canvas Preview */}
          <div className="lg:col-span-7 bg-[#1E293B] border border-slate-700/60 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 shadow-lg">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              LIVE DIGITAL PREVIEW (SCALED)
            </span>

            {/* Scaled Preview Box */}
            <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 border-slate-900 space-y-5 text-center">
              <div>
                <span
                  className="inline-block px-3 py-1 text-white font-bold text-[10px] uppercase tracking-wider rounded"
                  style={{ backgroundColor: accentColor }}
                >
                  SPECIAL PROMO
                </span>
                <h2 className="text-2xl font-black uppercase text-slate-900 mt-1">
                  {businessName || 'Business Name'}
                </h2>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-50 space-y-2">
                <h3
                  className="text-2xl font-black uppercase tracking-tight"
                  style={{ color: accentColor }}
                >
                  {offerHeadline || '$00 OFF SERVICE'}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3">
                  {offerSubtext || 'Offer details will appear here.'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase pt-1">
                  Expires: {expirationDate}
                </p>
              </div>

              <div
                className="py-2.5 text-white font-mono font-bold text-lg rounded-xl shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                📞 {phone || '(555) 000-0000'}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              Click &quot;Export / Print PDF&quot; above to output full 8.5x11 high-res print files.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
