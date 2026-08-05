'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2, Sparkles, Plus, X, FileImage, FileText, FileJson } from 'lucide-react';
import { FormFactorOptions, type OrgBrand, type FormFactor } from './types';
import type { BrandDna, DirectMailPackage } from '@/lib/sandboxPrompts';
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';
import DirectMailPostcardMockup from './DirectMailPostcardMockup';
import DirectMailLetterMockup from './DirectMailLetterMockup';

const FALLBACK_BRAND_COLOR = '#059669';
const DEFAULT_AUDIENCES = ['Business Owners', 'Past Individual Donors', 'Reach Program Donors'];

export default function DirectMailPanel({ activeBrandDna }: { activeBrandDna?: BrandDna | null } = {}) {
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [briefText, setBriefText] = useState('');
  const [formFactor, setFormFactor] = useState<FormFactor>('postcard');
  const [audiences, setAudiences] = useState<string[]>(DEFAULT_AUDIENCES);
  const [qrUrl, setQrUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pkg, setPkg] = useState<DirectMailPackage | null>(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'png' | 'pdf' | 'json' | null>(null);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const brandColor = selectedOrg?.primaryColor || FALLBACK_BRAND_COLOR;

  const updateAudience = (index: number, value: string) => {
    setAudiences((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const removeAudience = (index: number) => {
    setAudiences((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const addAudience = () => {
    setAudiences((prev) => [...prev, '']);
  };

  const canGenerate =
    briefText.trim().length > 0 &&
    qrUrl.trim().length > 0 &&
    audiences.some((a) => a.trim().length > 0) &&
    !generating;

  const generate = async () => {
    const cleanAudiences = audiences.map((a) => a.trim()).filter(Boolean);
    if (!briefText.trim() || !qrUrl.trim() || cleanAudiences.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/direct-mail', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText,
          formFactor,
          audiences: cleanAudiences,
          qrUrl,
          activeBrandDna: activeBrandDna || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Direct mail generation failed');
      const { success, ...rest } = data;
      setPkg(rest as DirectMailPackage);
      setActiveVariantIndex(0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate direct mail package');
    } finally {
      setGenerating(false);
    }
  };

  const captureCanvas = async (el: HTMLDivElement | null) => {
    if (!el) throw new Error('Mockup not ready');
    const html2canvas = (await import('html2canvas-pro')).default;
    return html2canvas(el, { scale: 3, useCORS: true });
  };

  const slugify = (value: string) => (value || 'direct-mail').replace(/\s+/g, '-').toLowerCase();

  const activeVariant = pkg?.variants[activeVariantIndex];

  const downloadPng = async () => {
    if (!pkg || !activeVariant) return;
    setExporting('png');
    try {
      const base = slugify(activeVariant.audienceName);
      if (pkg.formFactor === 'postcard') {
        const front = await captureCanvas(frontRef.current);
        const link1 = document.createElement('a');
        link1.download = `${base}-postcard-front.png`;
        link1.href = front.toDataURL('image/png');
        link1.click();
        const back = await captureCanvas(backRef.current);
        const link2 = document.createElement('a');
        link2.download = `${base}-postcard-back.png`;
        link2.href = back.toDataURL('image/png');
        link2.click();
      } else {
        const letter = await captureCanvas(letterRef.current);
        const link = document.createElement('a');
        link.download = `${base}-letter.png`;
        link.href = letter.toDataURL('image/png');
        link.click();
      }
      toast.success('PNG exported');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('Failed to export PNG');
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    if (!pkg || !activeVariant) return;
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const base = slugify(activeVariant.audienceName);
      if (pkg.formFactor === 'postcard') {
        const front = await captureCanvas(frontRef.current);
        const back = await captureCanvas(backRef.current);
        const pdf = new jsPDF({ unit: 'in', format: [6, 4] });
        pdf.addImage(front.toDataURL('image/png'), 'PNG', 0, 0, 6, 4);
        pdf.addPage([6, 4]);
        pdf.addImage(back.toDataURL('image/png'), 'PNG', 0, 0, 6, 4);
        pdf.save(`${base}-postcard.pdf`);
      } else {
        const letter = await captureCanvas(letterRef.current);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(letter.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
        pdf.save(`${base}-letter.pdf`);
      }
      toast.success('PDF exported');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  const downloadJson = () => {
    if (!pkg) return;
    setExporting('json');
    try {
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `direct-mail-${pkg.formFactor}-package.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Copy package exported');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Direct Mail Studio
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Organization (brand color)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            <option value="">No organization selected</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Brief</label>
          <textarea
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            rows={5}
            placeholder="e.g. Fall gala, Nov 14, matching funds up to $10,000, keynote from our program director."
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Form Factor</label>
          <div className="flex gap-2">
            {FormFactorOptions.map((ff) => (
              <button
                key={ff}
                onClick={() => setFormFactor(ff)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                  formFactor === ff
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {ff}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Audiences</label>
          <div className="space-y-1.5">
            {audiences.map((audience, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={audience}
                  onChange={(e) => updateAudience(i, e.target.value)}
                  placeholder="Audience name"
                  className="flex-1 bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
                />
                <button
                  onClick={() => removeAudience(i)}
                  disabled={audiences.length <= 1}
                  className="px-2 rounded-lg text-slate-400 hover:text-red-500 disabled:opacity-30"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addAudience}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Audience
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">QR Code Target URL</label>
          <input
            type="url"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            placeholder="https://example.org/rsvp"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          />
        </div>

        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Direct Mail Variants'}
        </button>
      </div>

      {/* RIGHT: Results */}
      <div className="space-y-4">
        {!pkg ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Fill in a brief and Generate Direct Mail Variants to see the mockups here.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-1.5">
              {pkg.variants.map((variant, i) => (
                <button
                  key={i}
                  onClick={() => setActiveVariantIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeVariantIndex === i
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {variant.audienceName || `Variant ${i + 1}`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadPng}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileImage className="w-3.5 h-3.5" /> {exporting === 'png' ? 'Exporting…' : 'Download PNG'}
              </button>
              <button
                onClick={downloadPdf}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> {exporting === 'pdf' ? 'Exporting…' : 'Download PDF'}
              </button>
              <button
                onClick={downloadJson}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5" /> Export All Copy (JSON)
              </button>
            </div>

            {pkg.variants[activeVariantIndex] &&
              (pkg.formFactor === 'postcard' ? (
                <DirectMailPostcardMockup
                  variant={pkg.variants[activeVariantIndex]}
                  brandColor={brandColor}
                  logoUrl={selectedOrg?.logoUrl}
                  orgName={selectedOrg?.name}
                  qrUrl={pkg.qrUrl}
                  frontRef={frontRef}
                  backRef={backRef}
                />
              ) : (
                <DirectMailLetterMockup
                  variant={pkg.variants[activeVariantIndex]}
                  brandColor={brandColor}
                  logoUrl={selectedOrg?.logoUrl}
                  orgName={selectedOrg?.name}
                  qrUrl={pkg.qrUrl}
                  letterRef={letterRef}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}
