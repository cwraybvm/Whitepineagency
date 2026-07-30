'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface SeoKeyword {
  id: string;
  keyword: string;
  currentRank: number;
  previousRank: number;
  searchVolume: number;
  targetUrl?: string;
}

export default function SeoTracker({ organizationId }: { organizationId: string }) {
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeywords();
  }, [organizationId]);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      }
    } catch (err) {
      console.error('Failed to fetch SEO keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankDelta = (current: number, previous: number) => {
    const delta = previous - current;
    if (delta > 0) {
      return (
        <span className="text-emerald-400 font-semibold flex items-center gap-0.5 text-xs">
          <ArrowUpRight className="w-3.5 h-3.5" /> +{delta}
        </span>
      );
    } else if (delta < 0) {
      return (
        <span className="text-rose-400 font-semibold flex items-center gap-0.5 text-xs">
          <ArrowDownRight className="w-3.5 h-3.5" /> {delta}
        </span>
      );
    }
    return (
      <span className="text-neutral-500 font-semibold flex items-center gap-0.5 text-xs">
        <Minus className="w-3.5 h-3.5" /> 0
      </span>
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-neutral-400">Loading live SEO rankings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">SEO & Keyword Performance</h2>
          <p className="text-xs text-neutral-400">Live search rankings and organic visibility metrics</p>
        </div>
      </div>

      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-950/50">
              <th className="py-3 px-4">Target Keyword</th>
              <th className="py-3 px-4">Google Rank</th>
              <th className="py-3 px-4">Movement</th>
              <th className="py-3 px-4">Monthly Search Vol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-xs">
            {keywords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-neutral-500">
                  No target keywords being tracked for this organization.
                </td>
              </tr>
            ) : (
              keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-neutral-800/30 transition">
                  <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    {kw.keyword}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 font-semibold text-white">
                      #{kw.currentRank}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getRankDelta(kw.currentRank, kw.previousRank)}</td>
                  <td className="py-3 px-4 text-neutral-400">{kw.searchVolume.toLocaleString()} / mo</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}