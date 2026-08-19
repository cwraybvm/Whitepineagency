'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Users, Loader2, Check, X, Mic, ListPlus, Lightbulb, ShieldQuestion, ListChecks } from 'lucide-react';

interface ConferenceCall {
  id: string | null;
  date: string;
  attended: boolean;
  notes: string;
  callType: string;
  keyTakeaways: string;
  objectionScripts: string;
  actionItems: string;
}

const CALL_PRESETS: { type: string; topic: string }[] = [
  { type: 'Tuesday Live Phone Training', topic: 'Live call role-play and objection handling drills' },
  { type: 'Wednesday Wisdom', topic: 'Weekly sales wisdom and best-practice sharing' },
  { type: 'Thursday Tech Talk', topic: 'Tools, CRM workflow, and tech stack walkthrough' },
  { type: 'Custom', topic: '' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyCall(date: string): ConferenceCall {
  return { id: null, date, attended: false, notes: '', callType: 'Custom', keyTakeaways: '', objectionScripts: '', actionItems: '' };
}

export default function ConferenceCallsPage() {
  const [date, setDate] = useState(todayStr());
  const [call, setCall] = useState<ConferenceCall>(() => emptyCall(todayStr()));
  const [history, setHistory] = useState<ConferenceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    loadedForDate.current = null;
    fetch(`/api/bvm/conference?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setCall({ ...emptyCall(date), ...data });
        loadedForDate.current = date;
      })
      .catch(() => toast.error('Failed to load conference call'))
      .finally(() => setLoading(false));

    fetch('/api/bvm/conference')
      .then((res) => res.json())
      .then(setHistory)
      .catch(() => {});
  }, [date]);

  function scheduleSave(next: ConferenceCall) {
    if (loadedForDate.current !== date) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/bvm/conference', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...next, date }),
        });
        if (!res.ok) throw new Error();
        setHistory((h) => {
          const filtered = h.filter((c) => c.date !== date);
          return [{ ...next, date }, ...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
        });
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function patch(fields: Partial<ConferenceCall>) {
    const next = { ...call, ...fields };
    setCall(next);
    scheduleSave(next);
  }

  async function createTaskFromActionItems() {
    if (!call.actionItems.trim()) {
      toast.error('Add an action item first');
      return;
    }
    setCreatingTask(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const firstLine = call.actionItems.trim().split('\n')[0].slice(0, 120);
      const res = await fetch('/api/focus-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${call.callType}] ${firstLine}`,
          dueDate: dueDate.toISOString(),
          isImportant: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Task created from action item');
    } catch {
      toast.error('Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  }

  const attendanceRate = history.length ? Math.round((history.filter((c) => c.attended).length / history.length) * 100) : 0;
  const activePreset = CALL_PRESETS.find((p) => p.type === call.callType);

  return (
    <div className={`px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 mx-auto ${liveMode ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Conference Calls</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Daily attendance + notes {saving && <span className="text-emerald-400">(saving…)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
          />
          <button
            onClick={() => setLiveMode((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${
              liveMode ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> {liveMode ? 'Exit Live Mode' : '🎙️ Live Call Mode'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : liveMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: call setup + attendance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Preset Call</label>
              <div className="flex flex-wrap gap-2">
                {CALL_PRESETS.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => patch({ callType: p.type })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      call.callType === p.type ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {p.type}
                  </button>
                ))}
              </div>
              {activePreset?.topic && <p className="text-[11px] text-slate-500 mt-2 italic">Today's topic: {activePreset.topic}</p>}
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Attendance</label>
              <div className="flex gap-2">
                <button
                  onClick={() => patch({ attended: true })}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                    call.attended ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" /> Yes
                </button>
                <button
                  onClick={() => patch({ attended: false })}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                    !call.attended ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <X className="w-3.5 h-3.5" /> No
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">General Notes</label>
              <textarea
                value={call.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                rows={8}
                placeholder="Freeform notes…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-sans resize-y focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Right: structured note-taking cards */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <label className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-500 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Key Takeaways
              </label>
              <textarea
                value={call.keyTakeaways}
                onChange={(e) => patch({ keyTakeaways: e.target.value })}
                rows={4}
                placeholder="What stood out?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-y focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <label className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-500 mb-2">
                <ShieldQuestion className="w-3.5 h-3.5 text-purple-400" /> Objection Scripts Learned
              </label>
              <textarea
                value={call.objectionScripts}
                onChange={(e) => patch({ objectionScripts: e.target.value })}
                rows={4}
                placeholder="New rebuttals / scripts…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-y focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <label className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-500 mb-2">
                <ListChecks className="w-3.5 h-3.5 text-sky-400" /> Action Items
              </label>
              <textarea
                value={call.actionItems}
                onChange={(e) => patch({ actionItems: e.target.value })}
                rows={4}
                placeholder="One per line…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-y focus:outline-none focus:border-sky-500/50"
              />
              <button
                onClick={createTaskFromActionItems}
                disabled={creatingTask}
                className="mt-2 w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5" />}
                Create Task from Action Item
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Attendance</label>
            <div className="flex gap-2">
              <button
                onClick={() => patch({ attended: true })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                  call.attended ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Yes
              </button>
              <button
                onClick={() => patch({ attended: false })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${
                  !call.attended ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <X className="w-3.5 h-3.5" /> No
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-slate-500 block mb-2">Notes</label>
            <textarea
              value={call.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={10}
              placeholder="Daily call notes…"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-sans resize-y focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Attendance History</h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">{attendanceRate}% attendance rate</span>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">No entries yet</p>
          ) : (
            history.map((c) => (
              <div key={c.date} className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400">
                  {c.date} <span className="text-slate-600">— {c.callType}</span>
                </span>
                <span className={c.attended ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{c.attended ? 'Yes' : 'No'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
