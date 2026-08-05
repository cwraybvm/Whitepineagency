'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Trash2, 
  Target,
  FileCode,
  Copy
} from 'lucide-react';

interface ParsedLead {
  id: string;
  businessName: string;
  trade: 'HVAC' | 'Plumbing' | 'Electrical' | 'General Trade';
  phone: string;
  email: string;
  city: string;
  auditSlug: string;
}

const SAMPLE_CSV_RAW = `Business Name,Trade,Phone,Email,City
Apex Mechanical,HVAC,(555) 234-5678,mark@apexmech.com,Austin
Northern Electric & Plumbing,Electrical,(555) 876-5432,info@northernelectric.com,Dallas
Cascade HVAC Solutions,HVAC,(555) 345-6789,service@cascadehvac.com,Houston
Highland Roofing Co.,General Trade,(555) 901-2345,contact@highlandroof.com,San Antonio`;

export default function LeadImporterPage() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState(SAMPLE_CSV_RAW);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  // Helper to generate dynamic audit slugs (e.g. "Apex Mechanical" -> "apex-mechanical")
  const slugifyify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const parseRawInput = () => {
    if (!rawInput.trim()) {
      toast.error('Please paste CSV data or JSON content first.');
      return;
    }

    try {
      const lines = rawInput.trim().split('\n');
      if (lines.length <= 1) {
        toast.error('No valid rows found in input.');
        return;
      }

      // Skip CSV Header row
      const dataRows = lines.slice(1);
      const results: ParsedLead[] = dataRows.map((line, idx) => {
        const columns = line.split(',').map((col) => col.trim());
        const businessName = columns[0] || `Prospect ${idx + 1}`;
        const rawTrade = columns[1] || 'General Trade';
        
        let validTrade: ParsedLead['trade'] = 'General Trade';
        if (['HVAC', 'Plumbing', 'Electrical'].includes(rawTrade)) {
          validTrade = rawTrade as ParsedLead['trade'];
        }

        return {
          id: `imported_${Date.now()}_${idx}`,
          businessName,
          trade: validTrade,
          phone: columns[2] || '(555) 000-0000',
          email: columns[3] || 'owner@example.com',
          city: columns[4] || 'Local Area',
          auditSlug: slugifyify(businessName),
        };
      });

      setParsedLeads(results);
      setIsParsed(true);
      toast.success(`Successfully parsed ${results.length} prospect leads!`);
    } catch (e) {
      toast.error('Failed to parse CSV format. Please check structure.');
    }
  };

  const handleCommitBatch = () => {
    if (parsedLeads.length === 0) return;

    // Save batch to LocalStorage under white_pine_imported_leads
    const existing = JSON.parse(localStorage.getItem('white_pine_imported_leads') || '[]');
    const updated = [...existing, ...parsedLeads];
    localStorage.setItem('white_pine_imported_leads', JSON.stringify(updated));

    toast.success(`Batch imported! ${parsedLeads.length} leads ready for outreach.`);
    router.push('/fulfillment');
  };

  const handleClear = () => {
    setRawInput('');
    setParsedLeads([]);
    setIsParsed(false);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-6">
        <div>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> UPGRADE #2 • PROSPECTING AUTOMATION
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            CSV / JSON Lead Batch Importer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Batch process raw contractor directory exports into normalized audit landing links.
          </p>
        </div>

        {isParsed && (
          <button
            onClick={handleCommitBatch}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer font-mono"
          >
            <CheckCircle2 className="w-4 h-4" /> Import {parsedLeads.length} Leads Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Raw Input Column */}
        <div className="lg:col-span-5 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Paste CSV or Directory Data
            </h3>
            <button
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-mono flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>

          <div className="space-y-3">
            <textarea
              rows={12}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setIsParsed(false);
              }}
              placeholder="Business Name,Trade,Phone,Email,City..."
              className="w-full bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/80 transition-all duration-200 leading-relaxed"
            />

            <button
              onClick={parseRawInput}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <FileCode className="w-4 h-4" /> Normalize & Parse CSV Batch
            </button>
          </div>
        </div>

        {/* Normalized Output Preview Column */}
        <div className="lg:col-span-7 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Normalized Audit Links ({parsedLeads.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {isParsed ? 'Ready to import' : 'Awaiting parse'}
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {!isParsed && (
              <div className="p-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                Paste raw CSV data on the left and click &quot;Normalize &amp; Parse CSV Batch&quot; to review generated prospect links.
              </div>
            )}

            {parsedLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-2 text-xs font-sans hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{lead.businessName}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{lead.city} • {lead.phone}</span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 rounded-md font-bold">
                    {lead.trade}
                  </span>
                </div>

                {/* Audit Link Preview */}
                <div className="p-2.5 bg-white/80 dark:bg-[#121824]/60 border border-slate-200/80 dark:border-slate-800 rounded-lg flex justify-between items-center text-[10px] font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400 truncate pr-2">
                    youragency.com/audit/{lead.auditSlug}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`youragency.com/audit/${lead.auditSlug}`);
                      toast.success('Audit link copied!');
                    }}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-bold shrink-0"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}