'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import { Plus, Star, ListTodo, Lightbulb, Loader2, Focus as FocusIcon, Sparkles, Shuffle, Wind, Package, Clock, PieChart, LayoutGrid, Kanban, Target, Zap, X, Swords, ChevronDown, Filter, Calendar, Rss } from 'lucide-react';
import { toast } from 'sonner';
import FocusModeOverlay, { type FocusSubtask } from '@/components/admin/FocusModeOverlay';
import TaskScheduleModal from '@/components/admin/TaskScheduleModal';
import IcalSubscribeModal from '@/components/admin/IcalSubscribeModal';
import BrainDumpModal from '@/components/admin/BrainDumpModal';
import DopamineResetDrawer from '@/components/admin/DopamineResetDrawer';
import ParkedTasksDrawer from '@/components/admin/ParkedTasksDrawer';
import ExecutiveSummaryDrawer from '@/components/admin/ExecutiveSummaryDrawer';
import RooseveltMatrix from '@/components/admin/RooseveltMatrix';
import DopamineBingoModal from '@/components/admin/DopamineBingoModal';
import DopamineVaultModal from '@/components/admin/DopamineVaultModal';
import BossBattleModal from '@/components/admin/BossBattleModal';
import StaleTasksModal, { type StaleTask } from '@/components/admin/StaleTasksModal';
import EnergyMatcherWidget from '@/components/admin/EnergyMatcherWidget';
import BillingTimerWidget from '@/components/BillingTimerWidget';
import { getTaskStreak, recordTaskCompletion, type StreakState } from '@/lib/taskStreak';
import { recommendedEnergy, type EnergyRecommendation } from '@/lib/energyMatcher';
import {
  type EnergyLevel,
  ENERGY_LEVELS,
  ENERGY_META,
  nextEnergyLevel,
  DURATION_OPTIONS,
  formatDuration,
  nextDuration,
  formatScheduledBadge,
} from '@/lib/taskFields';

interface FocusTask {
  id: string;
  title: string;
  status: 'INBOX' | 'ACTIVE' | 'DONE';
  priority: number;
  dueDate: string | null;
  isFocusToday: boolean;
  focusOrder: number | null;
  subtasks: FocusSubtask[] | null;
  organizationId: string | null;
  energyLevel: EnergyLevel | null;
  isParked: boolean;
  estimatedMinutes: number | null;
  completedAt: string | null;
  isUrgent: boolean;
  isImportant: boolean;
  scheduledAt: string | null;
  googleCalendarEventId: string | null;
  syncToGoogleCalendar: boolean;
}

const COLUMNS: { id: FocusTask['status']; label: string }[] = [
  { id: 'INBOX', label: 'Inbox' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DONE', label: 'Done' },
];

const EMPTY_STATE: Record<FocusTask['status'], { emoji: string; text: string }> = {
  INBOX: { emoji: '📥', text: "Inbox is clear! You're ready to focus." },
  ACTIVE: { emoji: '🎯', text: 'No active tasks — add one above or grab from Inbox.' },
  DONE: { emoji: '✅', text: 'Nothing completed yet — your first win is coming.' },
};

const LOW_BATTERY_STORAGE_KEY = 'wp-low-battery-mode';

function formatMinutesTotal(total: number): string {
  if (total < 60) return `${total}m`;
  const hours = Math.round((total / 60) * 10) / 10;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} hrs`;
}

function TasksLoadingSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoadingSkeleton />}>
      <TasksBoardContent />
    </Suspense>
  );
}

function TasksBoardContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [unstickingId, setUnstickingId] = useState<string | null>(null);
  const [focusOverlayIndex, setFocusOverlayIndex] = useState<number | null>(null);
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [quickAddEnergy, setQuickAddEnergy] = useState<EnergyLevel | null>(null);
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel | 'ALL'>('ALL');
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [parkedDrawerOpen, setParkedDrawerOpen] = useState(false);
  const [quickAddMinutes, setQuickAddMinutes] = useState<number | null>(null);
  const [quickAddScheduledAt, setQuickAddScheduledAt] = useState('');
  const [showQuickAddSchedule, setShowQuickAddSchedule] = useState(false);
  const [scheduleModalTaskId, setScheduleModalTaskId] = useState<string | null>(null);
  const [icalModalOpen, setIcalModalOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [view, setView] = useState<'KANBAN' | 'MATRIX'>('KANBAN');
  const [bingoOpen, setBingoOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [bossBattleTaskId, setBossBattleTaskId] = useState<string | null>(null);
  const [isLowBatteryMode, setIsLowBatteryMode] = useState(false);
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([]);
  const [staleModalOpen, setStaleModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<EnergyRecommendation | null>(null);
  const [mobileColumnTab, setMobileColumnTab] = useState<FocusTask['status']>('INBOX');
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [billingWidgetOpen, setBillingWidgetOpen] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const focusSessionStartRef = useRef<number | null>(null);

  function load() {
    fetch('/api/focus-tasks')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) setTasks(data);
      });
  }

  function loadStale() {
    fetch('/api/focus-tasks/stale')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStaleTasks(data.tasks);
      });
  }

  useEffect(load, []);
  useEffect(loadStale, []);
  useEffect(() => setStreak(getTaskStreak()), []);

  useEffect(() => {
    try {
      setIsLowBatteryMode(localStorage.getItem(LOW_BATTERY_STORAGE_KEY) === '1');
    } catch {}
  }, []);

  // Computed client-side only (not on initial render) so the server clock
  // can never disagree with the visitor's local time and cause a hydration mismatch.
  useEffect(() => {
    setRecommendation(recommendedEnergy());
  }, []);

  function toggleShowRecommended() {
    if (!recommendation) return;
    setEnergyFilter((prev) => (prev === recommendation.level ? 'ALL' : recommendation.level));
  }

  function toggleLowBatteryMode() {
    setIsLowBatteryMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOW_BATTERY_STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  // Tracks Focus Mode session length for the Bingo FOCUS_SESSION_COUNT / FOCUS_MINUTES goals.
  useEffect(() => {
    if (focusOverlayIndex !== null && focusSessionStartRef.current === null) {
      focusSessionStartRef.current = Date.now();
    }
  }, [focusOverlayIndex]);

  // Global nav "Focus Mode" quick-launch lands here with ?focus=1.
  useEffect(() => {
    if (searchParams.get('focus') === '1' && tasks.some((t) => t.status !== 'DONE')) {
      setFocusOverlayIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tasks.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        quickAddRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    const res = await fetch('/api/focus-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: quickAddValue.trim(),
        energyLevel: quickAddEnergy,
        estimatedMinutes: quickAddMinutes,
        scheduledAt: quickAddScheduledAt ? new Date(quickAddScheduledAt).toISOString() : null,
      }),
    });
    if (!res.ok) return;
    setQuickAddValue('');
    setQuickAddEnergy(null);
    setQuickAddMinutes(null);
    setQuickAddScheduledAt('');
    setShowQuickAddSchedule(false);
    load();
  }

  function cycleEnergyLevel(task: FocusTask) {
    const next = nextEnergyLevel(task.energyLevel);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, energyLevel: next } : t)));
    fetch(`/api/focus-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ energyLevel: next }),
    });
  }

  function cycleDuration(task: FocusTask) {
    const next = nextDuration(task.estimatedMinutes);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estimatedMinutes: next } : t)));
    fetch(`/api/focus-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimatedMinutes: next }),
    });
  }

  function toggleMatrixAxis(taskId: string, axis: 'isUrgent' | 'isImportant') {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const value = !task[axis];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, [axis]: value } : t)));
    fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [axis]: value }),
    });
  }

  function moveMatrixQuadrant(taskId: string, isUrgent: boolean, isImportant: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isUrgent, isImportant } : t)));
    fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isUrgent, isImportant }),
    });
  }

  function setParked(taskId: string, isParked: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isParked } : t)));
    fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isParked }),
    });
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as FocusTask['status'];
    const taskId = result.draggableId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    if (newStatus === 'DONE' && result.source.droppableId !== 'DONE') {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      setStreak(recordTaskCompletion());
    }
    const res = await fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) load();
  }

  async function toggleFocus(task: FocusTask) {
    const focusCount = tasks.filter((t) => t.isFocusToday).length;
    if (!task.isFocusToday && focusCount >= 3) return;
    const isFocusToday = !task.isFocusToday;
    const res = await fetch(`/api/focus-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFocusToday, focusOrder: isFocusToday ? focusCount + 1 : null }),
    });
    if (!res.ok) return;
    load();
  }

  async function patchSubtasks(taskId: string, subtasks: FocusSubtask[]) {
    const previous = tasks.find((t) => t.id === taskId)?.subtasks ?? null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks } : t)));
    try {
      const res = await fetch(`/api/focus-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks }),
      });
      if (!res.ok) throw new Error(`PATCH /api/focus-tasks/${taskId} failed with ${res.status}`);
    } catch (err) {
      // Roll back the optimistic update -- a failed save (e.g. the task was
      // deleted elsewhere, a P2025 "record not found") must not leave the
      // UI showing subtask state the server never persisted.
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks: previous } : t)));
      toast.error('Could not save subtask changes. Please try again.');
    }
  }

  async function unstickTask(taskId: string) {
    setUnstickingId(taskId);
    try {
      const res = await fetch(`/api/focus-tasks/${taskId}/unstick`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Unstick Me failed');
        return;
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks: updated.subtasks } : t)));
    } finally {
      setUnstickingId(null);
    }
  }

  async function toggleSubtask(taskId: string, subtaskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.subtasks) return;
    const next = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st));
    try {
      await patchSubtasks(taskId, next);
    } catch {
      toast.error('Could not update subtask. Please try again.');
    }
  }

  async function completeTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'DONE' } : t)));
    setStreak(recordTaskCompletion());
    await fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    });
  }

  async function handleStaleUnstick(taskId: string) {
    await unstickTask(taskId);
    setStaleTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleStalePark(taskId: string) {
    setParked(taskId, true);
    setStaleTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleStaleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setStaleTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`/api/focus-tasks/${taskId}`, { method: 'DELETE' });
    toast.success('Let go, guilt-free. One less thing on your plate.');
  }

  const bossBattleTask = bossBattleTaskId ? tasks.find((t) => t.id === bossBattleTaskId) ?? null : null;

  const openTasks = tasks.filter((t) => t.status !== 'DONE' && !t.isParked);
  const focusTasks = tasks
    .filter((t) => t.isFocusToday && !t.isParked)
    .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));
  const overlayTasks = pickedTaskId ? openTasks.filter((t) => t.id === pickedTaskId) : openTasks;
  const parkedTasks = tasks.filter((t) => t.isParked);
  const totalMinutesRemaining = openTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const recommendedMatchCount = recommendation
    ? openTasks.filter((t) => t.energyLevel === recommendation.level).length
    : 0;
  const lowBatteryTask =
    focusTasks[0] ?? [...openTasks].sort((a, b) => b.priority - a.priority)[0] ?? null;

  function closeOverlay() {
    setFocusOverlayIndex(null);
    setPickedTaskId(null);
    const startedAt = focusSessionStartRef.current;
    focusSessionStartRef.current = null;
    if (startedAt !== null) {
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      if (durationSeconds >= 5) {
        fetch('/api/focus-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationSeconds }),
        });
      }
    }
  }

  function pickSurpriseTask() {
    if (openTasks.length === 0) return;
    const weights = openTasks.map((t) => t.priority + 1);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    let chosen = openTasks[openTasks.length - 1];
    for (let i = 0; i < openTasks.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        chosen = openTasks[i];
        break;
      }
    }
    setPickedTaskId(chosen.id);
    setFocusOverlayIndex(0);
  }

  function focusQuickAdd() {
    quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    quickAddRef.current?.focus();
  }

  if (isLowBatteryMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
        <button
          onClick={toggleLowBatteryMode}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" /> Exit Low-Battery Mode
        </button>
        {lowBatteryTask ? (
          <div className="w-full max-w-md border border-amber-500/30 bg-amber-500/5 rounded-2xl p-8 text-center space-y-4">
            <div className="text-[11px] font-mono uppercase text-amber-400 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> One thing at a time
            </div>
            <div className="text-xl font-bold text-white">{lowBatteryTask.title}</div>
            {lowBatteryTask.energyLevel && (
              <div className="flex justify-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${ENERGY_META[lowBatteryTask.energyLevel].badge}`}>
                  {ENERGY_META[lowBatteryTask.energyLevel].emoji} {ENERGY_META[lowBatteryTask.energyLevel].short}
                </span>
              </div>
            )}
            <button
              onClick={() => completeTask(lowBatteryTask.id)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Mark Done
            </button>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">Nothing left to do. Nice work.</div>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-[calc(max(24px,env(safe-area-inset-top))+8px)] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ListTodo className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">Tasks</h1>
          {!!streak?.currentStreak && (
            <span className="flex items-center gap-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2.5 py-1 text-xs font-bold">
              🔥 {streak.currentStreak}-Day Streak
            </span>
          )}
          {totalMinutesRemaining > 0 && (
            <span className="flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full px-2.5 py-1 text-xs font-bold">
              ⏳ {formatMinutesTotal(totalMinutesRemaining)} remaining today
            </span>
          )}
          {/* Docked here instead of floating fixed over page content --
              BillingTimerWidget suppresses its own floating instance on
              this route (see BillingTimerWidget.tsx). Full widget on
              desktop; collapses to an icon toggle on mobile so it doesn't
              compete for space with New Task / ADHD Toolkit on the right. */}
          <div className="hidden md:block">
            <BillingTimerWidget variant="inline" />
          </div>
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setBillingWidgetOpen((v) => !v)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                billingWidgetOpen ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title="Billing timer"
            >
              <Clock className="w-4 h-4" />
            </button>
            {billingWidgetOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBillingWidgetOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-40">
                  <BillingTimerWidget variant="inline" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={focusQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>

          {/* Every launcher/toggle feature lives behind this one dropdown so
              the header stays a single clean row instead of 8+ competing
              buttons. Sections below give quick "am I in a mode?" cues via
              inline ON badges since those toggles are no longer visible
              buttons in their own right. */}
          <div className="relative">
            <button
              onClick={() => setToolkitOpen((v) => !v)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${
                toolkitOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🎯 ADHD Toolkit
              {(focusMode || isLowBatteryMode || (recommendation && energyFilter === recommendation.level)) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
            {toolkitOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setToolkitOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-[#0F172A] border border-white/10 rounded-xl shadow-xl z-40 p-1.5 space-y-0.5 max-h-[75vh] overflow-y-auto">
                  <div className="px-3 pt-1.5 pb-1 text-[10px] font-mono uppercase text-gray-600">View</div>
                  <button
                    onClick={() => {
                      setView((v) => (v === 'KANBAN' ? 'MATRIX' : 'KANBAN'));
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    {view === 'KANBAN' ? <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" /> : <Kanban className="w-3.5 h-3.5 text-emerald-400" />}
                    {view === 'KANBAN' ? 'Roosevelt Matrix' : 'Kanban Board'}
                  </button>
                  {recommendation && (
                    <button
                      onClick={() => {
                        toggleShowRecommended();
                        setToolkitOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-emerald-400" /> Circadian Matcher
                      </span>
                      {energyFilter === recommendation.level && <span className="text-emerald-400 text-[10px] font-mono">ON</span>}
                    </button>
                  )}

                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase text-gray-600 border-t border-white/5 mt-1">Focus</div>
                  <button
                    onClick={() => {
                      setFocusMode((v) => !v);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400" /> Top 3 Focus
                    </span>
                    {focusMode && <span className="text-amber-400 text-[10px] font-mono">ON</span>}
                  </button>
                  <button
                    onClick={() => {
                      setFocusOverlayIndex(0);
                      setToolkitOpen(false);
                    }}
                    disabled={openTasks.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left disabled:opacity-40"
                  >
                    <FocusIcon className="w-3.5 h-3.5 text-emerald-400" /> Focus Mode
                  </button>
                  <button
                    onClick={() => {
                      pickSurpriseTask();
                      setToolkitOpen(false);
                    }}
                    disabled={openTasks.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left disabled:opacity-40"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-emerald-400" /> Surprise Me
                  </button>
                  <button
                    onClick={() => {
                      setResetOpen(true);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <Wind className="w-3.5 h-3.5 text-emerald-400" /> 5-Min Reset
                  </button>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase text-gray-600 border-t border-white/5 mt-1">Games &amp; Insights</div>
                  <button
                    onClick={() => {
                      setInsightsOpen(true);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <PieChart className="w-3.5 h-3.5 text-emerald-400" /> Insights
                  </button>
                  <button
                    onClick={() => {
                      setBingoOpen(true);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-400" /> Bingo
                  </button>
                  <button
                    onClick={() => {
                      setVaultOpen(true);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    🏆 Dopamine Vault
                  </button>
                  <button
                    onClick={() => {
                      setIcalModalOpen(true);
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <Rss className="w-3.5 h-3.5 text-emerald-400" /> Subscribe via iCal
                  </button>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase text-gray-600 border-t border-white/5 mt-1">Mode</div>
                  <button
                    onClick={() => {
                      toggleLowBatteryMode();
                      setToolkitOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Low-Battery Mode
                    </span>
                    {isLowBatteryMode && <span className="text-amber-400 text-[10px] font-mono">ON</span>}
                  </button>
                  {staleTasks.length > 0 && (
                    <button
                      onClick={() => {
                        setStaleModalOpen(true);
                        setToolkitOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-300 hover:bg-white/10 text-left"
                    >
                      🧹 Sweep Stale ({staleTasks.length})
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {recommendation && (
        <EnergyMatcherWidget
          recommendation={recommendation}
          matchCount={recommendedMatchCount}
          active={energyFilter === recommendation.level}
          onToggle={toggleShowRecommended}
        />
      )}

      {/* Energy filters + quick-add combined into one collapsible bar so
          the board doesn't open under 2-3 stacked rows of small buttons. */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setFilterBarOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-500" /> Filter &amp; Add
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${filterBarOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterBarOpen && (
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/10">
            <div className="flex items-center flex-wrap gap-1">
              <span className="text-[11px] font-mono uppercase text-gray-500 pr-1">Energy</span>
              <button
                onClick={() => setEnergyFilter('ALL')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  energyFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All
              </button>
              {ENERGY_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setEnergyFilter(lvl)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    energyFilter === lvl ? ENERGY_META[lvl].pill : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {ENERGY_META[lvl].emoji} {ENERGY_META[lvl].short}
                </button>
              ))}
              <span className="w-px h-4 bg-white/10 mx-1" />
              <button
                onClick={() => setParkedDrawerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-400 hover:text-gray-200"
              >
                <Package className="w-3.5 h-3.5" /> Parked ({parkedTasks.length})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <form onSubmit={handleQuickAdd} className="flex gap-2 flex-1 sm:min-w-[220px]">
                <input
                  ref={quickAddRef}
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  placeholder="Quick add a task, press N to focus this box"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5">
                  {ENERGY_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      title={ENERGY_META[lvl].title}
                      onClick={() => setQuickAddEnergy((prev) => (prev === lvl ? null : lvl))}
                      className={`px-1.5 py-1 rounded-lg text-sm ${
                        quickAddEnergy === lvl ? ENERGY_META[lvl].pill : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {ENERGY_META[lvl].emoji}
                    </button>
                  ))}
                </div>
                {/* Duration presets are secondary -- hidden behind this icon
                    on mobile to cut vertical stacking, always shown on sm+. */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className={`sm:hidden flex items-center justify-center px-2 rounded-xl border ${
                    mobileFiltersOpen ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                  title="More options"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <div className={`${mobileFiltersOpen ? 'flex' : 'hidden'} sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5`}>
                  {DURATION_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      title={`${formatDuration(mins)} estimate`}
                      onClick={() => setQuickAddMinutes((prev) => (prev === mins ? null : mins))}
                      className={`px-1.5 py-1 rounded-lg text-[11px] font-medium ${
                        quickAddMinutes === mins ? 'bg-sky-500 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {formatDuration(mins)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  title="Schedule date/time"
                  onClick={() => setShowQuickAddSchedule((v) => !v)}
                  className={`flex items-center justify-center px-2 rounded-xl border ${
                    quickAddScheduledAt || showQuickAddSchedule
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  📅
                </button>
                {showQuickAddSchedule && (
                  <input
                    type="datetime-local"
                    value={quickAddScheduledAt}
                    onChange={(e) => setQuickAddScheduledAt(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white"
                  />
                )}
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <button
                onClick={() => setBrainDumpOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 sm:shrink-0"
              >
                <Sparkles className="w-4 h-4" /> Brain Dump
              </button>
            </div>
          </div>
        )}
      </div>

      {focusMode ? (
        <div className="space-y-2">
          <button onClick={() => setFocusMode(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
            <X className="w-3.5 h-3.5" /> Exit Top 3 Focus
          </button>
          {focusTasks.length === 0 && (
            <div className="text-gray-500 text-sm">No focus tasks picked yet. Star up to 3 below.</div>
          )}
          {focusTasks.map((t) => (
            <div key={t.id} className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 text-white">
              {t.title}
            </div>
          ))}
        </div>
      ) : view === 'MATRIX' ? (
        <div className="space-y-2">
          <button onClick={() => setView('KANBAN')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
            <Kanban className="w-3.5 h-3.5" /> Back to Kanban Board
          </button>
          <RooseveltMatrix tasks={openTasks} onToggleAxis={toggleMatrixAxis} onMove={moveMatrixQuadrant} />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Mobile: one column at a time via tabs instead of 3 stacked
              full-height columns. Desktop keeps the side-by-side grid. */}
          <div className="flex md:hidden items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mb-4">
            {COLUMNS.map((col) => {
              const count = tasks.filter((t) => t.status === col.id && !t.isParked).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileColumnTab(col.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    mobileColumnTab === col.id ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {col.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id && !t.isParked);
              return (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    data-testid={`column-${col.id}`}
                    className={`${mobileColumnTab === col.id ? 'block' : 'hidden'} md:block border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-inner shadow-emerald-500/5 rounded-2xl p-5 space-y-3 min-h-[220px]`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-200">{col.label}</span>
                      <span data-testid={`column-count-${col.id}`} className="text-[11px] font-mono text-gray-500 bg-white/5 rounded-full px-2 py-0.5">{colTasks.length}</span>
                    </div>
                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-center py-14 px-4 text-gray-400">
                        <span className="text-5xl mb-3">{EMPTY_STATE[col.id].emoji}</span>
                        <span className="text-sm font-medium max-w-[220px]">{EMPTY_STATE[col.id].text}</span>
                      </div>
                    )}
                    {colTasks
                      .map((t, index) => {
                        const matchesEnergy = energyFilter === 'ALL' || t.energyLevel === energyFilter;
                        return (
                        <Draggable draggableId={t.id} index={index} key={t.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              data-testid={`task-card-${t.id}`}
                              className={`bg-[#0F172A] border border-white/10 rounded-xl text-sm text-white space-y-2 transition-all duration-300 ease-in-out overflow-hidden ${
                                matchesEnergy
                                  ? 'max-h-[500px] opacity-100 p-3 mb-0'
                                  : 'max-h-0 opacity-0 p-0 mb-0 border-0 pointer-events-none'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{t.title}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      const idx = openTasks.findIndex((ot) => ot.id === t.id);
                                      if (idx >= 0) setFocusOverlayIndex(idx);
                                    }}
                                    disabled={t.status === 'DONE'}
                                    className="text-gray-600 hover:text-indigo-400 disabled:opacity-20 p-0.5"
                                    title="Focus on this task"
                                  >
                                    <FocusIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => toggleFocus(t)} className={t.isFocusToday ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}>
                                    <Star className="w-3.5 h-3.5" fill={t.isFocusToday ? 'currentColor' : 'none'} />
                                  </button>
                                  <button
                                    onClick={() => setParked(t.id, true)}
                                    className="text-gray-600 hover:text-orange-400 p-0.5"
                                    title="Park for later"
                                  >
                                    <Package className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setScheduleModalTaskId(t.id)}
                                    className={t.scheduledAt ? 'text-emerald-400 p-0.5' : 'text-gray-600 hover:text-emerald-400 p-0.5'}
                                    title="Schedule"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {t.scheduledAt && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  📅 {formatScheduledBadge(t.scheduledAt)}
                                </span>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => cycleEnergyLevel(t)}
                                  title="Click to change energy level"
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                                    t.energyLevel ? ENERGY_META[t.energyLevel].badge : 'border-white/10 text-gray-600 hover:text-gray-400'
                                  }`}
                                >
                                  {t.energyLevel ? (
                                    <>
                                      {ENERGY_META[t.energyLevel].emoji} {ENERGY_META[t.energyLevel].short}
                                    </>
                                  ) : (
                                    '+ Energy'
                                  )}
                                </button>
                                <button
                                  onClick={() => cycleDuration(t)}
                                  title="Click to change time estimate"
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                                    t.estimatedMinutes
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                      : 'border-white/10 text-gray-600 hover:text-gray-400'
                                  }`}
                                >
                                  {t.estimatedMinutes ? `⏱️ ${formatDuration(t.estimatedMinutes)}` : '+ Time'}
                                </button>
                              </div>

                              {t.subtasks && t.subtasks.length > 0 && (
                                <div className="space-y-1 pl-1">
                                  {t.subtasks.map((st) => (
                                    <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={st.done}
                                        onChange={() => toggleSubtask(t.id, st.id)}
                                        className="w-3 h-3 accent-emerald-500"
                                      />
                                      <span className={st.done ? 'text-gray-600 line-through' : 'text-gray-300'}>{st.title}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => unstickTask(t.id)}
                                  disabled={unstickingId === t.id}
                                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-400 disabled:opacity-50"
                                >
                                  {unstickingId === t.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Lightbulb className="w-3 h-3" />
                                  )}
                                  {unstickingId === t.id ? 'Breaking down…' : 'Unstick Me'}
                                </button>
                                {((t.subtasks && t.subtasks.length > 0) || (t.isUrgent && t.isImportant)) && (
                                  <button
                                    onClick={() => setBossBattleTaskId(t.id)}
                                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                                  >
                                    <Swords className="w-3 h-3" /> Boss Battle
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {focusOverlayIndex !== null && overlayTasks.length > 0 && (
        <FocusModeOverlay
          tasks={overlayTasks}
          startIndex={Math.min(focusOverlayIndex, overlayTasks.length - 1)}
          onClose={closeOverlay}
          onComplete={completeTask}
          onToggleSubtask={toggleSubtask}
          onBreakDown={unstickTask}
        />
      )}

      {brainDumpOpen && (
        <BrainDumpModal
          focusTodayCount={focusTasks.length}
          onClose={() => setBrainDumpOpen(false)}
          onImported={(count) => {
            setBrainDumpOpen(false);
            load();
            toast.success(`Added ${count} task${count === 1 ? '' : 's'}`);
          }}
        />
      )}

      {resetOpen && <DopamineResetDrawer onClose={() => setResetOpen(false)} />}

      {parkedDrawerOpen && (
        <ParkedTasksDrawer
          tasks={parkedTasks}
          onUnpark={(taskId) => setParked(taskId, false)}
          onClose={() => setParkedDrawerOpen(false)}
        />
      )}

      {staleModalOpen && (
        <StaleTasksModal
          tasks={staleTasks}
          unstickingId={unstickingId}
          onUnstick={handleStaleUnstick}
          onPark={handleStalePark}
          onDelete={handleStaleDelete}
          onClose={() => setStaleModalOpen(false)}
        />
      )}

      {insightsOpen && <ExecutiveSummaryDrawer tasks={tasks} onClose={() => setInsightsOpen(false)} />}

      {bingoOpen && <DopamineBingoModal onClose={() => setBingoOpen(false)} />}

      {vaultOpen && <DopamineVaultModal onClose={() => setVaultOpen(false)} />}

      {icalModalOpen && <IcalSubscribeModal onClose={() => setIcalModalOpen(false)} />}

      {scheduleModalTaskId && (() => {
        const scheduleTask = tasks.find((t) => t.id === scheduleModalTaskId);
        if (!scheduleTask) return null;
        return (
          <TaskScheduleModal
            task={scheduleTask}
            onClose={() => setScheduleModalTaskId(null)}
            onSaved={(updated) =>
              setTasks((prev) => prev.map((t) => (t.id === scheduleModalTaskId ? { ...t, ...updated } : t)))
            }
          />
        );
      })()}

      {bossBattleTask && (
        <BossBattleModal
          task={bossBattleTask}
          onToggleSubtask={toggleSubtask}
          onComplete={(taskId) => {
            completeTask(taskId);
            setBossBattleTaskId(null);
          }}
          onClose={() => setBossBattleTaskId(null)}
        />
      )}
    </div>
  );
}
