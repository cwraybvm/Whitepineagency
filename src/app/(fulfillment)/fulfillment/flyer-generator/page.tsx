'use client';

import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { Printer, Download, FileImage, FileText, Sun, Moon, Phone } from 'lucide-react';

type Theme = 'dark' | 'light';

export default function FlyerGeneratorPage() {
  const [promoTitle, setPromoTitle] = useState('$79 Spring AC Tune-Up');
  const [subtitle, setSubtitle] = useState('Beat the Heat Before It Hits');
  const [businessName, setBusinessName] = useState('Apex Mechanical Services');
  const [contactPhone, setContactPhone] = useState('(555) 234-5678');
  const [qrUrl, setQrUrl] = useState('https://example.com/book');
  const [theme, setTheme] = useState<Theme>('dark');
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);

  const captureCanvas = async () => {
    // html2canvas (unmaintained, predates oklch) chokes on Tailwind v4's
    // oklch()-based generated CSS even when this component itself uses
    // inline hex colors — its computed-style walk hits Tailwind's global
    // base/theme rules on ancestor elements regardless. html2canvas-pro is
    // a maintained fork adding modern CSS color support; same API.
    const html2canvas = (await import('html2canvas-pro')).default;
    if (!posterRef.current) throw new Error('Poster not ready');
    return html2canvas(posterRef.current, { scale: 3, useCORS: true });
  };

  const downloadPng = async () => {
    setExporting('png');
    try {
      const canvas = await captureCanvas();
      const link = document.createElement('a');
      link.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}-flyer.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Flyer PNG downloaded');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('Failed to export PNG');
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    setExporting('pdf');
    try {
      const canvas = await captureCanvas();
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      // Poster is portrait — a US Letter page in portrait orientation.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.height / canvas.width;
      let renderWidth = pageWidth;
      let renderHeight = pageWidth * imgRatio;
      if (renderHeight > pageHeight) {
        renderHeight = pageHeight;
        renderWidth = pageHeight / imgRatio;
      }
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;
      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
      pdf.save(`${businessName.replace(/\s+/g, '-').toLowerCase()}-flyer.pdf`);
      toast.success('Flyer PDF downloaded');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> PRODUCTION
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Offer &amp; Flyer Canvas Generator</h1>
        <p className="text-xs text-slate-400">
          Build a printable promo flyer live, then export it as a PNG or PDF for the client.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* LEFT: Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Flyer Controls
          </h2>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Promo Title</label>
            <input
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Business Name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Contact Phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">QR Code URL Target</label>
            <input
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Poster Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isDark ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !isDark ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={downloadPng}
              disabled={exporting !== null}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileImage className="w-3.5 h-3.5" />
              {exporting === 'png' ? 'Exporting…' : 'Download Flyer (PNG)'}
            </button>
            <button
              onClick={downloadPdf}
              disabled={exporting !== null}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              {exporting === 'pdf' ? 'Exporting…' : 'Download Flyer (PDF)'}
            </button>
          </div>
        </div>

        {/* RIGHT: Live Canvas Preview */}
        <div className="flex justify-center">
          <div
            ref={posterRef}
            // html2canvas 1.4.x can't parse the oklch()/color-mix() colors
            // Tailwind v4's utility classes compile to — every color in this
            // subtree is an inline style (plain hex/rgba) instead of a
            // Tailwind color class so the export doesn't crash. Non-color
            // utilities (layout, spacing, type scale) are unaffected and
            // stay as Tailwind classes.
            className="w-full max-w-[500px] aspect-[3/4] rounded-2xl p-10 flex flex-col justify-between shadow-2xl border-8 relative overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(to bottom right, #0F172A, #0B1120)'
                : 'linear-gradient(to bottom right, #FFFFFF, #F8FAFC)',
              color: isDark ? '#FFFFFF' : '#0F172A',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}
          >
            <div className="relative z-10 space-y-3">
              <span
                className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE',
                  color: isDark ? '#7DD3FC' : '#0369A1',
                  borderColor: isDark ? 'rgba(14,165,233,0.3)' : '#7DD3FC',
                }}
              >
                Limited Time Offer
              </span>
              <h2 className="text-4xl font-black leading-[1.05] tracking-tight break-words">
                {promoTitle}
              </h2>
              <p className="text-base font-semibold" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                {subtitle}
              </p>
            </div>

            <div className="relative z-10 flex items-end justify-between gap-4 pt-6">
              <div className="space-y-1.5 min-w-0">
                <p className="text-lg font-black truncate">{businessName}</p>
                <p
                  className="text-sm font-mono font-bold flex items-center gap-1.5"
                  style={{ color: isDark ? '#34D399' : '#059669' }}
                >
                  <Phone className="w-3.5 h-3.5" /> {contactPhone}
                </p>
              </div>

              <div
                className="p-2 rounded-xl shrink-0 border"
                style={{ backgroundColor: '#FFFFFF', borderColor: isDark ? '#FFFFFF' : '#E2E8F0' }}
              >
                <QRCode value={qrUrl || 'https://example.com'} size={72} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
