'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X, Mic, MicOff, Loader2, Sparkles, Star } from 'lucide-react';
import { type EnergyLevel, ENERGY_LEVELS, ENERGY_META, DURATION_OPTIONS, formatDuration } from '@/lib/taskFields';

interface BrainDumpModalProps {
  focusTodayCount: number;
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ReviewRow {
  key: string;
  title: string;
  energyLevel: EnergyLevel | null;
  estimatedMinutes: number | null;
  focusToday: boolean;
  included: boolean;
}

// Chrome/Edge only — no polyfill, mic button just doesn't render elsewhere.
function getSpeechRecognition(): typeof window.SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export default function BrainDumpModal({ focusTodayCount, onClose, onImported }: BrainDumpModalProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [listening, setListening] = useState(false);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(null);
  const SpeechRecognition = getSpeechRecognition();

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  function toggleListening() {
    if (!SpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const chunk = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ');
      setText((prev) => (prev ? `${prev} ${chunk}` : chunk));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleParse() {
    if (!text.trim() || parsing) return;
    setParsing(true);
    try {
      const res = await fetch('/api/focus-tasks/parse-brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Brain dump parse failed');
        return;
      }
      const parsed: { title: string; energyLevel: EnergyLevel | null; estimatedMinutes: number | null; isFocusToday: boolean }[] =
        body.tasks || [];
      setRows(
        parsed.map((t) => ({
          key: crypto.randomUUID(),
          title: t.title,
          energyLevel: t.energyLevel,
          estimatedMinutes: t.estimatedMinutes,
          focusToday: t.isFocusToday,
          included: true,
        }))
      );
    } finally {
      setParsing(false);
    }
  }

  function updateRow(key: string, patch: Partial<ReviewRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.key === key ? { ...r, ...patch } : r)) : prev));
  }

  async function handleImport() {
    if (!rows || importing) return;
    const selected = rows.filter((r) => r.included && r.title.trim());
    if (selected.length === 0) return;

    setImporting(true);
    try {
      const created: { id: string; wantsFocusToday: boolean }[] = [];
      for (const row of selected) {
        const res = await fetch('/api/focus-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: row.title.trim(),
            energyLevel: row.energyLevel,
            estimatedMinutes: row.estimatedMinutes,
          }),
        });
        if (!res.ok) continue;
        const task = await res.json();
        created.push({ id: task.id, wantsFocusToday: row.focusToday });
      }

      // Flag "focus today" for as many as still fit under the app's existing 3-max
      // Top 3 Focus cap -- silently skip the rest, same convention toggleFocus uses.
      let remaining = Math.max(0, 3 - focusTodayCount);
      let order = focusTodayCount;
      for (const task of created) {
        if (!task.wantsFocusToday || remaining <= 0) continue;
        order += 1;
        remaining -= 1;
        fetch(`/api/focus-tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFocusToday: true, focusOrder: order }),
        });
      }

      onImported(created.length);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Quick Brain Dump
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!rows ? (
          <>
            <p className="text-xs text-gray-500">
              Paste or dictate everything on your mind. AI will split it into tasks with an energy
              level, time estimate, and today-priority guess for each — you review before anything
              is created.
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. follow up with the Simmons account, renew the domain before it expires, draft next week's newsletter..."
              rows={8}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none"
            />

            <div className="flex items-center justify-between gap-2">
              {SpeechRecognition ? (
                <button
                  onClick={toggleListening}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                    listening ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {listening ? 'Stop dictating' : 'Dictate'}
                </button>
              ) : (
                <span />
              )}

              <button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-40"
              >
                {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {parsing ? 'Parsing…' : '✨ AI Parse Tasks'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Review, edit, or uncheck anything before importing.
            </p>

            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.key} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => updateRow(row.key, { included: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 shrink-0"
                  />
                  <input
                    value={row.title}
                    onChange={(e) => updateRow(row.key, { title: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    {ENERGY_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        title={ENERGY_META[lvl].title}
                        onClick={() => updateRow(row.key, { energyLevel: row.energyLevel === lvl ? null : lvl })}
                        className={`px-1 py-0.5 rounded text-xs ${
                          row.energyLevel === lvl ? ENERGY_META[lvl].pill : 'text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {ENERGY_META[lvl].emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {DURATION_OPTIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => updateRow(row.key, { estimatedMinutes: row.estimatedMinutes === mins ? null : mins })}
                        className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                          row.estimatedMinutes === mins ? 'bg-sky-500 text-white' : 'text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {formatDuration(mins)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    title="Focus today"
                    onClick={() => updateRow(row.key, { focusToday: !row.focusToday })}
                    className={`shrink-0 p-0.5 ${row.focusToday ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
                  >
                    <Star className="w-3.5 h-3.5" fill={row.focusToday ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setRows(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || rows.every((r) => !r.included)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-40"
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {importing ? 'Importing…' : 'Import Selected Tasks'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
