'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Search,
  Filter,
  CheckSquare,
  Plus,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Tag,
  Eye,
  X,
  Loader2,
  Zap,
  PhoneCall,
  Link2,
  CheckCircle2,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface FulfillmentTask {
  id: string;
  organizationId?: string | null;
  clientName: string;
  ownerName: string;
  trade: 'HVAC' | 'Plumbing' | 'Electrical' | 'General Trade';
  title: string;
  status: 'Intake Pending' | 'Content Uploaded' | 'Setup Live' | 'Active Retainer';
  contractValue: number;
  driveFolderUrl?: string | null;
  stageEnteredAt: string;
  slaDeadline: string | null;
  contactEmail: string;
  contactPhone: string;
  checklist: ChecklistItem[];
  offerHeadline?: string | null;
  notes?: string | null;
  targetLinkUrl?: string | null;
}

const STAGES: FulfillmentTask['status'][] = [
  'Intake Pending',
  'Content Uploaded',
  'Setup Live',
  'Active Retainer',
];

const ORG_ID = 'default-tenant-workspace';

function daysInStage(stageEnteredAt: string, now: number): number {
  return Math.floor((now - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
}

function slaCountdown(slaDeadline: string | null, now: number): { label: string; breached: boolean } | null {
  if (!slaDeadline) return null;
  const diffMs = new Date(slaDeadline).getTime() - now;
  if (diffMs <= 0) {
    const hoursAgo = Math.floor(-diffMs / (1000 * 60 * 60));
    return { label: `Breached ${hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`}`, breached: true };
  }
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  if (hoursLeft < 24) return { label: `${hoursLeft}h left`, breached: false };
  return { label: `${Math.floor(hoursLeft / 24)}d left`, breached: false };
}

export default function UltimateFulfillmentPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<FulfillmentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [showSlaBreachedOnly, setShowSlaBreachedOnly] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [activePreviewTask, setActivePreviewTask] = useState<FulfillmentTask | null>(null);
  const [areaCodeInput, setAreaCodeInput] = useState('');
  const [provisioningTaskId, setProvisioningTaskId] = useState<string | null>(null);
  const [validatingTaskId, setValidatingTaskId] = useState<string | null>(null);
  const [savingLinkTaskId, setSavingLinkTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/fulfillment?orgId=${ORG_ID}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
    } catch {
      toast.error('Failed to load fulfillment board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Live SLA countdown — re-renders every minute off the stored timestamps,
  // no refetch needed.
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleStageChange = async (id: string, newStatus: FulfillmentTask['status']) => {
    const previousTasks = tasks;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === newStatus) return;

    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus, stageEnteredAt: now } : t))
    );

    try {
      const res = await fetch('/api/fulfillment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      const { task: updated } = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success(`Moved "${task.clientName}" to "${newStatus}"`);
    } catch {
      setTasks(previousTasks);
      toast.error(`Failed to move "${task.clientName}" — reverted`);
    }
  };

  const toggleChecklistItem = async (taskId: string, itemId: string) => {
    const previousTasks = tasks;
    const task = tasks.find((t) => t.id === taskId);
    const item = task?.checklist.find((i) => i.id === itemId);
    if (!task || !item) return;

    const nextDone = !item.done;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, checklist: t.checklist.map((i) => (i.id === itemId ? { ...i, done: nextDone } : i)) }
          : t
      )
    );

    try {
      const res = await fetch('/api/fulfillment/checklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, done: nextDone }),
      });
      if (!res.ok) throw new Error('Update failed');
    } catch {
      setTasks(previousTasks);
      toast.error('Failed to save checklist change — reverted');
    }
  };

  const syncTaskLocally = (taskId: string, patch: Partial<FulfillmentTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    setActivePreviewTask((prev) => (prev && prev.id === taskId ? { ...prev, ...patch } : prev));
  };

  const provisionPhoneNumber = async (task: FulfillmentTask) => {
    if (!/^\d{3}$/.test(areaCodeInput.trim())) {
      toast.error('Enter a valid 3-digit area code');
      return;
    }

    setProvisioningTaskId(task.id);
    try {
      const res = await fetch('/api/fulfillment/twilio-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, areaCode: areaCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');
      toast.success(`Provisioned ${data.phoneNumber} for "${task.clientName}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to provision number');
    } finally {
      setProvisioningTaskId(null);
    }
  };

  const saveTargetLink = async (task: FulfillmentTask) => {
    setSavingLinkTaskId(task.id);
    try {
      const res = await fetch('/api/fulfillment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, targetLinkUrl: task.targetLinkUrl || '' }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Target link saved');
    } catch {
      toast.error('Failed to save target link');
    } finally {
      setSavingLinkTaskId(null);
    }
  };

  const validateLiveLink = async (task: FulfillmentTask) => {
    if (!task.targetLinkUrl) {
      toast.error('Set a target link URL first');
      return;
    }

    setValidatingTaskId(task.id);
    try {
      const res = await fetch('/api/fulfillment/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed');

      if (data.ok) {
        toast.success(`Link returned 200 OK${data.checklistUpdated ? ' — "Verify Target Link" checked off' : ''}`);
        if (data.checklistUpdated && data.item) {
          syncTaskLocally(task.id, {
            checklist: task.checklist.map((i) => (i.id === data.item.id ? { ...i, done: true } : i)),
          });
        }
      } else {
        toast.error(`Link check failed — status ${data.statusCode || 'unreachable'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to validate link');
    } finally {
      setValidatingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = selectedTrade === 'All' || t.trade === selectedTrade;
    const breach = slaCountdown(t.slaDeadline, nowTick);
    const matchesSla = !showSlaBreachedOnly || breach?.breached;
    return matchesSearch && matchesTrade && matchesSla;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">

      {/* Asset Preview Modal */}
      {activePreviewTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setActivePreviewTask(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono text-sky-400 uppercase">
                ASSET SUMMARY PREVIEW
              </span>
              <h3 className="text-lg font-bold text-white">{activePreviewTask.clientName}</h3>
              <p className="text-xs text-slate-400">Owner: {activePreviewTask.ownerName}</p>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Primary Offer Headline:</span>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">
                  {activePreviewTask.offerHeadline || 'No offer headline uploaded yet'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Internal Production Notes:</span>
                <p className="text-slate-300 mt-0.5">{activePreviewTask.notes || 'None'}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] font-mono">
                <span>Value: <strong className="text-white">${activePreviewTask.contractValue}/mo</strong></span>
                {activePreviewTask.driveFolderUrl && (
                  <a
                    href={activePreviewTask.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <FolderOpen className="w-3 h-3" /> Drive Folder ↗
                  </a>
                )}
              </div>
            </div>

            {/* Automated Actions Panel */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] font-bold font-mono text-amber-400 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Automated Actions
              </span>

              {/* Twilio: Provision Phone Number */}
              <div className="space-y-1.5 pb-3 border-b border-slate-800">
                <label className="text-[10px] text-slate-500 font-mono uppercase block">
                  Provision Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={areaCodeInput}
                    onChange={(e) => setAreaCodeInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="Area code"
                    maxLength={3}
                    className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={() => provisionPhoneNumber(activePreviewTask)}
                    disabled={provisioningTaskId === activePreviewTask.id || !activePreviewTask.organizationId}
                    title={!activePreviewTask.organizationId ? 'Task has no linked organization' : undefined}
                    className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                  >
                    {provisioningTaskId === activePreviewTask.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <PhoneCall className="w-3 h-3" />
                    )}
                    Provision via Twilio
                  </button>
                </div>
              </div>

              {/* Link Validator: Validate Live Link */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-mono uppercase block">
                  Review / Landing Page URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={activePreviewTask.targetLinkUrl || ''}
                    onChange={(e) => syncTaskLocally(activePreviewTask.id, { targetLinkUrl: e.target.value })}
                    onBlur={() => saveTargetLink(activePreviewTask)}
                    placeholder="https://client-site.com/reviews"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono min-w-0"
                  />
                  <button
                    onClick={() => validateLiveLink(activePreviewTask)}
                    disabled={validatingTaskId === activePreviewTask.id || !activePreviewTask.targetLinkUrl}
                    className="shrink-0 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                  >
                    {validatingTaskId === activePreviewTask.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Link2 className="w-3 h-3" />
                    )}
                    Validate Live Link
                  </button>
                </div>
                {activePreviewTask.checklist.some(
                  (i) => i.label.trim().toLowerCase() === 'verify target link' && i.done
                ) && (
                  <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> "Verify Target Link" checked off
                  </p>
                )}
                {savingLinkTaskId === activePreviewTask.id && (
                  <p className="text-[10px] text-slate-500 font-mono">Saving…</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setActivePreviewTask(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AGENCY OPERATIONAL MATRIX
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Client Service Fulfillment Board
          </h1>
          <p className="text-xs text-slate-400">
            Track client onboarding stages, SLA timers, and production assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Standalone entry point -- reachable even with zero clients
              listed, unlike the per-card "Audit" link below which only
              exists once a fulfillment task card does. */}
          <button
            onClick={() => router.push('/fulfillment/competitor-audit')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" /> 🔍 Competitor Audit
          </button>
          <button
            onClick={() => router.push('/intake')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> Intake Portal
          </button>
          <button
            onClick={() => router.push('/admin/onboarding')}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Client Onboarding
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, owner, or service..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500 ml-1 mr-1" />
            {['All', 'HVAC', 'Plumbing', 'Electrical'].map((trade) => (
              <button
                key={trade}
                onClick={() => setSelectedTrade(trade)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all ${
                  selectedTrade === trade
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trade}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSlaBreachedOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all flex items-center gap-1.5 ${
              showSlaBreachedOnly
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>SLA Breached</span>
          </button>
        </div>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading fulfillment board from database…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageTasks = filteredTasks.filter((t) => t.status === stage);

            return (
              <div key={stage} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 min-h-[600px] flex flex-col justify-between">

                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {stage}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                      {stageTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageTasks.map((task) => {
                      const completedChecklistCount = task.checklist.filter((i) => i.done).length;
                      const progressPct = Math.round(
                        (completedChecklistCount / (task.checklist.length || 1)) * 100
                      );
                      const sla = slaCountdown(task.slaDeadline, nowTick);
                      const days = daysInStage(task.stageEnteredAt, nowTick);

                      return (
                        <div
                          key={task.id}
                          className={`bg-slate-950 border rounded-xl p-4 space-y-3 relative transition-all shadow-md ${
                            sla?.breached ? 'border-rose-500/50 shadow-rose-950/20' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* SLA Timer & Value Bar */}
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                              sla?.breached
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              <Clock className="w-3 h-3" /> {sla ? sla.label : `${days}d in stage`}
                            </span>

                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              <Tag className="w-3 h-3" /> ${task.contractValue}/mo
                            </span>
                          </div>

                          {/* Title & Owner */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-bold text-white tracking-tight">
                                {task.clientName}
                              </h4>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-sky-400 rounded">
                                {task.trade}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-sans">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-slate-400 font-sans">
                              Owner: <strong className="text-slate-200">{task.ownerName}</strong>
                            </p>
                          </div>

                          {/* Direct Contact Row */}
                          <div className="flex items-center gap-3 text-[10px] font-mono pt-1 text-slate-400 border-t border-slate-900">
                            <a
                              href={`tel:${task.contactPhone}`}
                              className="hover:text-sky-400 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-sky-400" /> {task.contactPhone}
                            </a>
                            <a
                              href={`mailto:${task.contactEmail}`}
                              className="hover:text-sky-400 flex items-center gap-1 truncate"
                            >
                              <Mail className="w-3 h-3 text-sky-400" /> Email
                            </a>
                          </div>

                          {/* Task Checklist */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-slate-500" /> Tasks
                              </span>
                              <span>{completedChecklistCount}/{task.checklist.length} ({progressPct}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-500 h-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Interactive Sub-items */}
                          <div className="space-y-1 pt-1 border-t border-slate-900">
                            {task.checklist.map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => toggleChecklistItem(task.id, item.id)}
                                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 w-3 h-3 cursor-pointer"
                                />
                                <span className={item.done ? 'line-through text-slate-500' : ''}>
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Quick Tools & Asset Drawer Trigger */}
                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px]">
                            <button
                              onClick={() => setActivePreviewTask(task)}
                              className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Preview Assets
                            </button>

                            <div className="flex gap-2">
                              <button
                                onClick={() => router.push('/fulfillment/flyer-generator')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Flyer
                              </button>
                              <button
                                onClick={() => router.push('/fulfillment/geo-expansion')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Geo
                              </button>
                              <button
                                onClick={() => router.push('/fulfillment/competitor-audit?client=' + encodeURIComponent(task.clientName))}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Audit
                              </button>
                              <button
                                onClick={() => router.push('/admin/quote?client=' + encodeURIComponent(task.clientName))}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Proposal
                              </button>
                              <button
                                onClick={() => router.push('/admin/onboarding')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Onboard
                              </button>
                            </div>
                          </div>

                          {/* Stage Selector */}
                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-mono">Stage:</span>
                            <select
                              value={task.status}
                              onChange={(e) => handleStageChange(task.id, e.target.value as FulfillmentTask['status'])}
                              className="bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-sky-500 font-mono"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>

                        </div>
                      );
                    })}

                    {stageTasks.length === 0 && (
                      <div className="p-8 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl font-mono">
                        No accounts in this stage
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
