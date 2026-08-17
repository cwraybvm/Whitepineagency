'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X, TrendingUp, TrendingDown, Minus, Clock, Flame, PieChart as PieIcon } from 'lucide-react';
import {
  getWeeklyStats,
  getEnergyBreakdown,
  getStreakConsistency,
  type AnalyticsTask,
} from '@/lib/taskAnalytics';
import { getTaskStreak } from '@/lib/taskStreak';

interface ExecutiveSummaryDrawerProps {
  tasks: AnalyticsTask[];
  onClose: () => void;
}

const ENERGY_COLORS: Record<string, string> = {
  LOW: '#f59e0b', // amber, matches the energy badge palette
  MEDIUM: '#6366f1', // indigo
  HIGH: '#ef4444', // red
  UNTAGGED: '#475569', // slate, for completed-but-untagged tasks
};

const ENERGY_LABELS: Record<string, string> = {
  LOW: '⚡ Low',
  MEDIUM: '🧠 Medium',
  HIGH: '🔥 High',
  UNTAGGED: 'Untagged',
};

function formatHours(hours: number): string {
  if (hours === 0) return '0m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

export default function ExecutiveSummaryDrawer({ tasks, onClose }: ExecutiveSummaryDrawerProps) {
  const weekly = getWeeklyStats(tasks);
  const energyBreakdown = getEnergyBreakdown(tasks).filter((s) => s.count > 0);
  const consistency = getStreakConsistency(tasks);
  const streak = getTaskStreak();

  const TrendIcon = weekly.trendPercent === null ? Minus : weekly.trendPercent >= 0 ? TrendingUp : TrendingDown;
  const trendLabel =
    weekly.trendPercent === null
      ? 'new'
      : `${weekly.trendPercent >= 0 ? '+' : ''}${weekly.trendPercent}% vs last week`;
  const trendColor =
    weekly.trendPercent === null ? 'text-gray-400' : weekly.trendPercent >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <PieIcon className="w-4 h-4 text-sky-400" /> Executive Summary
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-gray-500">Weekly Throughput</div>
            <div className="text-3xl font-bold text-white">{weekly.completedThisWeek}</div>
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" /> {trendLabel}
            </div>
            <div className="text-[11px] text-gray-500 pt-1">{weekly.completionRate}% completion rate</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Focus Hours Logged
            </div>
            <div className="text-3xl font-bold text-white">{formatHours(weekly.hoursCompletedThisWeek)}</div>
            <div className="text-[11px] text-gray-500 pt-1">estimated time, tasks completed this week</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-gray-500 flex items-center gap-1">
              <Flame className="w-3 h-3" /> Streak Achievements
            </div>
            <div className="text-3xl font-bold text-white">
              {streak.currentStreak} <span className="text-sm font-normal text-gray-400">day{streak.currentStreak === 1 ? '' : 's'}</span>
            </div>
            <div className="text-[11px] text-gray-500">Longest: {streak.longestStreak} days</div>
            <div className="inline-flex items-center gap-1 mt-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5 text-[10px] font-bold">
              {consistency}% consistent this week
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
            <div className="text-[11px] font-mono uppercase text-gray-500">Energy Distribution</div>
            {energyBreakdown.length === 0 ? (
              <div className="text-xs text-gray-500 py-6 text-center">No completions this week yet.</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={energyBreakdown} dataKey="count" nameKey="level" innerRadius={22} outerRadius={40} paddingAngle={2}>
                        {energyBreakdown.map((slice) => (
                          <Cell key={slice.level} fill={ENERGY_COLORS[slice.level]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 flex-1">
                  {energyBreakdown.map((slice) => (
                    <div key={slice.level} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ENERGY_COLORS[slice.level] }} />
                        {ENERGY_LABELS[slice.level]}
                      </span>
                      <span className="text-gray-500">{slice.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
