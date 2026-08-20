'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Gift, X, Loader2, Plus } from 'lucide-react';
import { TARGET_TYPE_OPTIONS, EMOJI_PRESETS } from '@/lib/goalDisplay';

interface AddIncentiveGoalButtonProps {
  onCreated?: () => void;
}

const TIMEFRAMES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'] as const;

const EMPTY_FORM = {
  title: '',
  targetType: TARGET_TYPE_OPTIONS[0].value,
  targetValue: '',
  timeframe: 'WEEKLY' as (typeof TIMEFRAMES)[number],
  startDate: '',
  endDate: '',
  rewardIcon: EMOJI_PRESETS[0],
};

export default function AddIncentiveGoalButton({ onCreated }: AddIncentiveGoalButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.targetValue) {
      toast.error('Enter a title and target value');
      return;
    }
    if (form.timeframe === 'CUSTOM' && (!form.startDate || !form.endDate)) {
      toast.error('Custom timeframe needs a start and end date');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/bvm/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Incentive goal created');
      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error('Failed to create goal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-4 rounded-xl"
      >
        <Gift className="w-4 h-4" /> 🎁 Add Incentive Goal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">🎁 New Incentive Goal</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Reward Title</label>
            <input
              required
              placeholder="e.g. New BJJ Gi & Belt"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Target Metric</label>
            <select
              value={form.targetType}
              onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            >
              {TARGET_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Target Threshold Value</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 500"
              value={form.targetValue}
              onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Timeframe</label>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, timeframe: t }))}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold uppercase ${
                    form.timeframe === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {form.timeframe === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-500 block">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-500 block">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rewardIcon: emoji }))}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center text-lg rounded-lg border ${
                    form.rewardIcon === emoji ? 'border-purple-500 bg-purple-500/20' : 'border-slate-800 bg-slate-950 hover:bg-white/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                value={form.rewardIcon}
                onChange={(e) => setForm((f) => ({ ...f, rewardIcon: e.target.value }))}
                placeholder="Custom"
                className="w-16 min-h-[44px] bg-slate-950 border border-slate-800 rounded-lg px-2 text-center text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Create Goal'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
