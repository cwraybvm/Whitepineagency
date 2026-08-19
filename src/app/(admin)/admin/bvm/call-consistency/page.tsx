'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Phone, Minus, Plus, Loader2, ListPlus, Check, Gauge, Mail, X, Send } from 'lucide-react';
import { BVM_STATUS_OPTIONS, BVM_STATUS_COLOR } from '@/lib/bvmStatus';

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const MIN_CELLS = 45;
const MAX_CELLS = 70;
const STEP = 5;
const DAILY_TARGET = 45;
const FOLLOW_UP_STATUSES = new Set(['LVM', 'NA']);
const QUICK_EMAIL_STATUSES = new Set(['LMGK', 'LVM', 'Yes']);

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}
// BVM's working day for pace comparison -- calls logged vs. expected-by-now.
const WORKDAY_START_MIN = 9 * 60;
const WORKDAY_END_MIN = 17 * 60;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildGrid(count: number): CellDatum[] {
  return Array.from({ length: count }, (_, i) => ({ cellNumber: i + 1, status: null }));
}

function computePace(filled: number, date: string): { label: string; className: string } | null {
  if (date !== todayStr()) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const frac = Math.min(1, Math.max(0, (nowMin - WORKDAY_START_MIN) / (WORKDAY_END_MIN - WORKDAY_START_MIN)));
  if (frac <= 0) return { label: 'Not Started', className: 'text-slate-400' };
  const expected = Math.round(DAILY_TARGET * frac);
  if (filled >= expected) return { label: 'Ahead of Pace', className: 'text-emerald-400' };
  if (filled >= expected - 5) return { label: 'On Pace', className: 'text-amber-400' };
  return { label: 'Behind Pace', className: 'text-red-400' };
}

export default function CallConsistencyPage() {
  const [date, setDate] = useState(todayStr());
  const [cellCount, setCellCount] = useState(MIN_CELLS);
  const [cellData, setCellData] = useState<CellDatum[]>(buildGrid(MIN_CELLS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spawnedCells, setSpawnedCells] = useState<Set<number>>(new Set());
  const [spawningCell, setSpawningCell] = useState<number | null>(null);
  const [emailCell, setEmailCell] = useState<CellDatum | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailForm, setEmailForm] = useState({ to: '', clientName: '', magazineZone: '', senderName: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailedCells, setEmailedCells] = useState<Set<number>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    loadedForDate.current = null;
    setSpawnedCells(new Set());
    setEmailedCells(new Set());
    fetch(`/api/bvm/call-log?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        setCellCount(data.cellCount || MIN_CELLS);
        setCellData(data.cellData || buildGrid(MIN_CELLS));
        loadedForDate.current = date;
      })
      .catch(() => toast.error('Failed to load call log'))
      .finally(() => setLoading(false));
  }, [date]);

  function scheduleSave(nextCellCount: number, nextCellData: CellDatum[]) {
    if (loadedForDate.current !== date) return; // don't save over data we haven't finished loading
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/bvm/call-log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, cellCount: nextCellCount, cellData: nextCellData }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function setCellStatus(cellNumber: number, status: string | null) {
    const next = cellData.map((c) => (c.cellNumber === cellNumber ? { ...c, status } : c));
    setCellData(next);
    scheduleSave(cellCount, next);
  }

  function resizeGrid(delta: number) {
    const next = Math.min(MAX_CELLS, Math.max(MIN_CELLS, cellCount + delta));
    if (next === cellCount) return;
    let nextData: CellDatum[];
    if (next > cellCount) {
      nextData = [...cellData, ...Array.from({ length: next - cellCount }, (_, i) => ({ cellNumber: cellCount + i + 1, status: null }))];
    } else {
      nextData = cellData.filter((c) => c.cellNumber <= next);
    }
    setCellCount(next);
    setCellData(nextData);
    scheduleSave(next, nextData);
  }

  async function spawnFollowUpTask(cell: CellDatum) {
    setSpawningCell(cell.cellNumber);
    try {
      const dueDate = new Date(`${date}T00:00:00.000Z`);
      dueDate.setUTCDate(dueDate.getUTCDate() + 1);
      const res = await fetch('/api/focus-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `BVM Follow-up: Cell #${cell.cellNumber} (${cell.status}) — ${date}`,
          dueDate: dueDate.toISOString(),
          isUrgent: cell.status === 'NA',
        }),
      });
      if (!res.ok) throw new Error();
      setSpawnedCells((prev) => new Set(prev).add(cell.cellNumber));
      toast.success(`Follow-up task created for cell #${cell.cellNumber}`);
    } catch {
      toast.error('Failed to spawn follow-up task');
    } finally {
      setSpawningCell(null);
    }
  }

  function openQuickEmail(cell: CellDatum) {
    setEmailCell(cell);
    setSelectedTemplateId('');
    setEmailForm({ to: '', clientName: '', magazineZone: '', senderName: '' });
    if (templates.length === 0) {
      setTemplatesLoading(true);
      fetch('/api/bvm/email-templates')
        .then((res) => res.json())
        .then(setTemplates)
        .catch(() => toast.error('Failed to load email templates'))
        .finally(() => setTemplatesLoading(false));
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;
  const previewSubject = selectedTemplate ? fillTemplate(selectedTemplate.subject, emailForm) : '';
  const previewBody = selectedTemplate ? fillTemplate(selectedTemplate.body, emailForm) : '';

  async function sendQuickEmail() {
    if (!emailCell || !selectedTemplate || !emailForm.to) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailForm.to, subject: previewSubject, body: previewBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setEmailedCells((prev) => new Set(prev).add(emailCell.cellNumber));
      toast.success(`Email sent to ${emailForm.to}`);
      setEmailCell(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  }

  const pace = computePace(cellData.filter((c) => c.status).length, date);

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(BVM_STATUS_OPTIONS.map((o) => [o.value, 0]));
    let filled = 0;
    for (const c of cellData) {
      if (c.status && counts[c.status] !== undefined) {
        counts[c.status]++;
        filled++;
      }
    }
    return { counts, filled };
  }, [cellData]);

  const pieData = BVM_STATUS_OPTIONS.map((o) => ({ name: o.label, value: breakdown.counts[o.value] })).filter((d) => d.value > 0);

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Call Consistency</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Daily call grid — auto-saves as you go {saving && <span className="text-emerald-400">(saving…)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-white tabular-nums">
            {breakdown.filled}/{DAILY_TARGET} Calls Completed
          </span>
          {pace && <span className={`text-xs font-mono font-bold uppercase ${pace.className}`}>— {pace.label}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
        <span className="text-[11px] font-mono uppercase text-slate-500">Grid size: {cellCount} cells</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => resizeGrid(-STEP)}
            disabled={cellCount <= MIN_CELLS}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => resizeGrid(STEP)}
            disabled={cellCount >= MAX_CELLS}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {cellData.map((cell) => {
              const color = cell.status ? BVM_STATUS_COLOR[cell.status] : undefined;
              return (
                <div
                  key={cell.cellNumber}
                  className="rounded-lg border border-slate-800 overflow-hidden flex flex-col"
                  style={color ? { borderColor: color } : undefined}
                >
                  <span className="text-[9px] font-mono text-slate-500 text-center pt-1">{cell.cellNumber}</span>
                  <select
                    value={cell.status || ''}
                    onChange={(e) => setCellStatus(cell.cellNumber, e.target.value || null)}
                    className="w-full text-[10px] font-bold text-center py-1.5 bg-slate-950 focus:outline-none cursor-pointer"
                    style={color ? { color, backgroundColor: `${color}1A` } : { color: '#64748b' }}
                  >
                    <option value="">—</option>
                    {BVM_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} style={{ color: '#000' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {cell.status && FOLLOW_UP_STATUSES.has(cell.status) && (
                    spawnedCells.has(cell.cellNumber) ? (
                      <span className="flex items-center justify-center gap-1 text-[8px] font-bold text-emerald-400 py-1 bg-slate-950">
                        <Check className="w-2.5 h-2.5" /> Task
                      </span>
                    ) : (
                      <button
                        onClick={() => spawnFollowUpTask(cell)}
                        disabled={spawningCell === cell.cellNumber}
                        title="Spawn follow-up task"
                        className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400 hover:text-white py-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {spawningCell === cell.cellNumber ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <ListPlus className="w-2.5 h-2.5" />
                        )}{' '}
                        Follow-up
                      </button>
                    )
                  )}
                  {cell.status && QUICK_EMAIL_STATUSES.has(cell.status) && (
                    <button
                      onClick={() => openQuickEmail(cell)}
                      title="Quick email"
                      className={`flex items-center justify-center gap-1 text-[8px] font-bold py-1 bg-slate-950 hover:bg-slate-800 ${
                        emailedCells.has(cell.cellNumber) ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Mail className="w-2.5 h-2.5" /> {emailedCells.has(cell.cellNumber) ? 'Sent' : 'Quick Email'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Daily Breakdown</h3>
          <div className="space-y-2">
            {BVM_STATUS_OPTIONS.map((o) => (
              <div key={o.value} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </span>
                <span className="text-white font-bold tabular-nums">{breakdown.counts[o.value]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
              <span className="text-slate-500 uppercase">Total Calls</span>
              <span className="text-emerald-400 font-bold tabular-nums">{breakdown.filled} / {cellCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Category Split</h3>
          {pieData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No calls logged yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} label={(d) => `${d.name} ${Math.round((d.value / breakdown.filled) * 100)}%`}>
                  {pieData.map((d, i) => {
                    const opt = BVM_STATUS_OPTIONS.find((o) => o.label === d.name);
                    return <Cell key={i} fill={opt?.color || '#64748b'} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {emailCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEmailCell(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                ✉️ Quick Email — Cell #{emailCell.cellNumber} ({emailCell.status})
              </h2>
              <button type="button" onClick={() => setEmailCell(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Template</label>
            {templatesLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading templates…
              </div>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.category} — {t.name}</option>
                ))}
              </select>
            )}

            <label className="text-[11px] font-mono uppercase text-slate-500 block">To</label>
            <input type="email" required placeholder="recipient@example.com" value={emailForm.to} onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block">Client Name</label>
                <input placeholder="{{clientName}}" value={emailForm.clientName} onChange={(e) => setEmailForm((f) => ({ ...f, clientName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block">Magazine Zone</label>
                <input placeholder="{{magazineZone}}" value={emailForm.magazineZone} onChange={(e) => setEmailForm((f) => ({ ...f, magazineZone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <label className="text-[11px] font-mono uppercase text-slate-500 block">Sender Name</label>
            <input placeholder="{{senderName}}" value={emailForm.senderName} onChange={(e) => setEmailForm((f) => ({ ...f, senderName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            {selectedTemplate && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                <p className="text-xs font-bold text-white">{previewSubject}</p>
                <p className="text-[11px] text-slate-400 whitespace-pre-line">{previewBody}</p>
              </div>
            )}

            <button
              onClick={sendQuickEmail}
              disabled={!selectedTemplate || !emailForm.to || sendingEmail}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingEmail ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
