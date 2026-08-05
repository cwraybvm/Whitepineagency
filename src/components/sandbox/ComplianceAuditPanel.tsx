'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, ScanSearch, Download, ChevronDown, FileText, FileCode, ArrowRightCircle } from 'lucide-react';
import type { BrandDna, ComplianceReport } from '@/lib/sandboxPrompts';
import { buildComplianceAuditMarkdown, buildComplianceAuditHtml } from '@/lib/auditExport';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';
import CopyButton from './CopyButton';
import type { SandboxTool } from './types';

const PLATFORMS = ['General', 'Meta', 'Google', 'TikTok'] as const;

const INSERT_TARGETS: { id: SandboxTool; label: string }[] = [
  { id: 'copy', label: 'Copy Studio' },
  { id: 'ad', label: 'Ad Builder' },
  { id: 'video', label: 'Video Lab' },
  { id: 'campaign', label: 'Campaign Engine' },
];

const STATUS_COLOR: Record<ComplianceReport['status'], string> = {
  PASSED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  WARNING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  CRITICAL_RISK: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

const SEVERITY_COLOR: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  HIGH: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ComplianceAuditPanel({
  activeBrandDna,
  onInsertPhrase,
}: {
  activeBrandDna?: BrandDna | null;
  onInsertPhrase: (tool: SandboxTool, text: string) => void;
}) {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('General');
  const [copyText, setCopyText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const scan = async () => {
    if (!copyText.trim()) return;
    setScanning(true);
    try {
      const res = await fetch('/api/sandbox/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyText, platform: platform === 'General' ? undefined : platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compliance audit failed');
      const { success, ...rest } = data;
      setReport(rest as ComplianceReport);
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan compliance');
    } finally {
      setScanning(false);
    }
  };

  const exportHtml = () => {
    if (!report) return;
    downloadTextFile('compliance-audit.html', buildComplianceAuditHtml(report, copyText, activeBrandDna?.brandName), 'text/html');
    setExportOpen(false);
  };

  const exportMarkdown = () => {
    if (!report) return;
    downloadTextFile('compliance-audit.md', buildComplianceAuditMarkdown(report, copyText), 'text/markdown');
    setExportOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Ad Policy Compliance Scanner
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Copy to Audit</label>
          <textarea
            value={copyText}
            onChange={(e) => setCopyText(e.target.value)}
            rows={8}
            placeholder="Paste ad copy to check for policy violations…"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <button
          onClick={scan}
          disabled={scanning || !copyText.trim()}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
          {scanning ? 'Scanning…' : 'Scan Compliance'}
        </button>

        {report && (
          <div
            tabIndex={-1}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setExportOpen(false);
            }}
            className="relative pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Audit Report <ChevronDown className="w-3 h-3" />
            </button>
            {exportOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-10">
                <button onClick={exportHtml} className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                  <FileCode className="w-3.5 h-3.5" /> Download HTML Report (.html)
                </button>
                <button onClick={exportMarkdown} className="w-full px-3 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                  <FileText className="w-3.5 h-3.5" /> Download Markdown Report (.md)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Results */}
      <div className="space-y-4">
        {!report ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Paste ad copy and Scan Compliance to see the audit report here.
          </div>
        ) : (
          <>
            <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_COLOR[report.status]}`}>
                {report.status}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{report.complianceScore}/100</span>
            </div>

            {report.violations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Violations</h3>
                <div className="space-y-2">
                  {report.violations.map((v, i) => (
                    <div key={i} className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{v.policy}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_COLOR[v.severity]}`}>{v.severity}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{v.flagReason}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400"><strong>Suggested rewrite:</strong> {v.suggestedRewrite}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.cleanCopy && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Clean Copy</h3>
                <div className="group relative bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-4 pr-16 pb-12">
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{report.cleanCopy}</p>
                  <CopyButton text={report.cleanCopy} />
                  <div
                    tabIndex={-1}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setReplaceOpen(false);
                    }}
                    className="absolute bottom-2 right-2"
                  >
                    <button
                      onClick={() => setReplaceOpen((o) => !o)}
                      title="Replace copy in a generation tool"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border bg-white/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                    >
                      <ArrowRightCircle className="w-3 h-3" /> Replace Copy
                    </button>
                    {replaceOpen && (
                      <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-10 min-w-[160px]">
                        {INSERT_TARGETS.map((target) => (
                          <button
                            key={target.id}
                            onClick={() => {
                              onInsertPhrase(target.id, report.cleanCopy);
                              setReplaceOpen(false);
                              toast.success(`Inserted into ${target.label}`);
                            }}
                            className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left whitespace-nowrap"
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
