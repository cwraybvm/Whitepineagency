'use client';

import React, { useState, useEffect } from 'react';
import { Video, FileText, Calendar, Plus, ExternalLink, Award } from 'lucide-react';

interface MonthlyReport {
  id: string;
  title: string;
  monthPeriod: string;
  loomEmbedUrl?: string;
  summaryNotes?: string;
  metricsSnapshot?: any;
  createdAt: string;
}

export default function MonthlyReportFeed({ organizationId }: { organizationId: string }) {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [organizationId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cmo/reports?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-neutral-400">Loading executive reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Executive CMO Monthly Reports</h2>
            <p className="text-xs text-neutral-400">Monthly strategy walk-throughs & performance snapshots</p>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 text-center backdrop-blur-md">
          <Award className="w-8 h-8 text-rose-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-semibold text-white">No Reports Generated Yet</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Monthly reports created for this client will appear here with Loom walk-through embeds.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <h3 className="text-base font-semibold text-white">{report.title}</h3>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {report.monthPeriod}
                </span>
              </div>

              {/* Loom Video Embed */}
              {report.loomEmbedUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-neutral-800 bg-black">
                  <iframe
                    src={report.loomEmbedUrl.replace('/share/', '/embed/')}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Summary Notes */}
              {report.summaryNotes && (
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                  <span className="text-xs font-semibold text-rose-400 block mb-1">Executive Summary</span>
                  <p className="text-xs text-neutral-300 whitespace-pre-wrap">{report.summaryNotes}</p>
                </div>
              )}

              {/* Frozen Snapshot Badges */}
              {report.metricsSnapshot && (
                <div className="flex items-center space-x-3 text-xs text-neutral-400 pt-2 border-t border-neutral-800/60">
                  <span>
                    Published Posts: <strong className="text-white">{report.metricsSnapshot.publishedPostsCount || 0}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    KPIs Snapshotted: <strong className="text-white">{report.metricsSnapshot.kpis?.length || 0} Metrics</strong>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}