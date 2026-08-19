'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FileBarChart2, Gauge, Users2, TrendingUp, Download, Loader2 } from 'lucide-react';

interface ReportsData {
  generatedAt: string;
  taskVelocity: { date: string; count: number }[];
  slaComplianceRate: number;
  slaBreakdown: { onTime: number; breached: number; total: number };
  activeClientUsage: { organizationId: string; name: string; count: number }[];
  leadConversion: {
    byStage: { stage: string; count: number }[];
    totalLeads: number;
    closedWon: number;
    conversionRate: number;
  };
}

const SLA_COLORS = ['#10B981', '#EF4444'];

function ChartPanel({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

export default function FulfillmentReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/fulfillment/reports')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load reports'));
  }, []);

  async function handleExportPdf() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#020617' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`fulfillment-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Executive PDF report downloaded');
    } catch (err) {
      console.error('Report PDF export failed:', err);
      toast.error('Failed to export PDF report');
    } finally {
      setExporting(false);
    }
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl text-white">
          <h3 className="text-red-400 font-semibold">Reports failed to load</h3>
          <p className="text-slate-400 text-sm mt-2 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const totalCompleted = data.taskVelocity.reduce((sum, d) => sum + d.count, 0);
  const topClient = data.activeClientUsage[0];
  const slaPieData = [
    { name: 'On Time', value: data.slaBreakdown.onTime },
    { name: 'Breached', value: data.slaBreakdown.breached },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <FileBarChart2 className="w-3.5 h-3.5" /> FULFILLMENT TELEMETRY
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Reports</h1>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Compiling...' : 'Export PDF Report'}
        </button>
      </div>

      <div ref={reportRef} className="space-y-6 bg-[#020617] p-1">
        {/* KPI summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] font-mono uppercase text-slate-500">Tasks Completed (14d)</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">{totalCompleted}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] font-mono uppercase text-slate-500">SLA Compliance</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{data.slaComplianceRate}%</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] font-mono uppercase text-slate-500">Top Active Client</p>
            <p className="text-lg font-bold text-white mt-1 truncate">{topClient?.name || '—'}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] font-mono uppercase text-slate-500">Lead Conversion</p>
            <p className="text-2xl font-bold text-sky-400 mt-1 tabular-nums">{data.leadConversion.conversionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartPanel icon={TrendingUp} title="Task Completion Velocity" subtitle="Focus tasks completed per day, last 14 days">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.taskVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel icon={Gauge} title="SLA Compliance Rate" subtitle={`${data.slaBreakdown.onTime} on time / ${data.slaBreakdown.total} tracked deadlines`}>
            {data.slaBreakdown.total === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No SLA deadlines tracked yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={slaPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {slaPieData.map((_, i) => (
                      <Cell key={i} fill={SLA_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel icon={Users2} title="Active Client Usage" subtitle="Content + fulfillment activity, trailing 30 days">
            {data.activeClientUsage.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No client activity yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.activeClientUsage} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={110} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          <ChartPanel icon={FileBarChart2} title="Lead Conversion Rates" subtitle={`${data.leadConversion.closedWon} closed won / ${data.leadConversion.totalLeads} total leads`}>
            {data.leadConversion.byStage.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No leads yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.leadConversion.byStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="stage" stroke="#64748b" fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>
      </div>
    </div>
  );
}
