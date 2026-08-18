'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Trophy, Flame, Clock, Award } from 'lucide-react';
import { type EnergyLevel, ENERGY_LEVELS, ENERGY_META } from '@/lib/taskFields';

interface VaultCompletion {
  id: string;
  title: string;
  completedAt: string;
  category: EnergyLevel | null;
}

interface VaultBadge {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

interface VaultData {
  totalCompletedTasks: number;
  recentCompletions: VaultCompletion[];
  focus: { totalMinutes: number; totalSessions: number; activeStreak: number };
  badges: VaultBadge[];
}

const BADGE_EMOJI: Record<string, string> = {
  'focus-master': '🧠',
  'bingo-champ': '🎯',
  'task-sweeper': '🧹',
};

interface DopamineVaultModalProps {
  onClose: () => void;
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours >= 10 ? Math.round(hours).toString() : (Math.round(hours * 10) / 10).toString();
}

function formatCompletedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DopamineVaultModal({ onClose }: DopamineVaultModalProps) {
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<EnergyLevel | 'ALL'>('ALL');

  useEffect(() => {
    fetch('/api/dopamine-vault')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  const filteredCompletions = data
    ? data.recentCompletions.filter((t) => categoryFilter === 'ALL' || t.category === categoryFilter)
    : [];

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">🏆 Dopamine Vault</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
                <Trophy className="w-5 h-5 text-emerald-400 mx-auto" />
                <div className="text-2xl font-bold text-white">{data.totalCompletedTasks}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-300/80">Completed Tasks</div>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-center space-y-1">
                <Clock className="w-5 h-5 text-sky-400 mx-auto" />
                <div className="text-2xl font-bold text-white">{formatHours(data.focus.totalMinutes)}h</div>
                <div className="text-[10px] uppercase tracking-wide text-sky-300/80">Total Focus Hours</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-center space-y-1">
                <Flame className="w-5 h-5 text-orange-400 mx-auto" />
                <div className="text-2xl font-bold text-white">{data.focus.activeStreak}</div>
                <div className="text-[10px] uppercase tracking-wide text-orange-300/80">Active Streak</div>
              </div>
              <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-4 text-center space-y-1">
                <Award className="w-5 h-5 text-fuchsia-400 mx-auto" />
                <div className="text-2xl font-bold text-white">{data.badges.filter((b) => b.unlocked).length}</div>
                <div className="text-[10px] uppercase tracking-wide text-fuchsia-300/80">Unlocked Badges</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-gray-500">Badge Showcase</div>
              <div className="grid grid-cols-3 gap-2">
                {data.badges.map((badge) => (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={`rounded-xl border p-3 text-center space-y-1 ${
                      badge.unlocked
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-gray-600 grayscale opacity-50'
                    }`}
                  >
                    <div className="text-xl">{BADGE_EMOJI[badge.id] ?? '🏅'}</div>
                    <div className="text-[11px] font-medium leading-snug">{badge.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono uppercase text-gray-500">Victory Wall</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      categoryFilter === 'ALL' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  {ENERGY_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setCategoryFilter(lvl)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        categoryFilter === lvl ? ENERGY_META[lvl].pill : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {ENERGY_META[lvl].emoji} {ENERGY_META[lvl].short}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCompletions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  Nothing here yet. Complete a task and it'll show up on the wall.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {filteredCompletions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2"
                    >
                      <span className="text-sm text-gray-200 truncate">✅ {t.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.category && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${ENERGY_META[t.category].badge}`}>
                            {ENERGY_META[t.category].emoji}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{formatCompletedAt(t.completedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
