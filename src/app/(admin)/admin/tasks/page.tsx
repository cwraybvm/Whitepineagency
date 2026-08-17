'use client';

import { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Star, ListTodo, Zap, Loader2, Focus as FocusIcon } from 'lucide-react';
import FocusModeOverlay, { type FocusSubtask } from '@/components/admin/FocusModeOverlay';

interface FocusTask {
  id: string;
  title: string;
  status: 'INBOX' | 'ACTIVE' | 'DONE';
  priority: number;
  dueDate: string | null;
  isFocusToday: boolean;
  focusOrder: number | null;
  subtasks: FocusSubtask[] | null;
}

const COLUMNS: { id: FocusTask['status']; label: string }[] = [
  { id: 'INBOX', label: 'Inbox' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DONE', label: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [focusOverlayIndex, setFocusOverlayIndex] = useState<number | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

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

  useEffect(load, []);

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
      body: JSON.stringify({ title: quickAddValue.trim() }),
    });
    if (!res.ok) return;
    setQuickAddValue('');
    load();
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as FocusTask['status'];
    const taskId = result.draggableId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
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
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks } : t)));
    await fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtasks }),
    });
  }

  async function breakDownTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setBreakingDownId(taskId);
    try {
      const res = await fetch('/api/tasks/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title }),
      });
      if (!res.ok) return;
      const { subtasks } = await res.json();
      const steps: FocusSubtask[] = (subtasks as string[]).map((title) => ({
        id: crypto.randomUUID(),
        title,
        done: false,
      }));
      await patchSubtasks(taskId, steps);
    } finally {
      setBreakingDownId(null);
    }
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.subtasks) return;
    const next = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st));
    patchSubtasks(taskId, next);
  }

  async function completeTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'DONE' } : t)));
    await fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    });
  }

  const openTasks = tasks.filter((t) => t.status !== 'DONE');
  const focusTasks = tasks.filter((t) => t.isFocusToday).sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
              focusMode ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Top 3 Focus
          </button>
          <button
            onClick={() => setFocusOverlayIndex(0)}
            disabled={openTasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-30"
          >
            <FocusIcon className="w-3.5 h-3.5" /> Focus Mode
          </button>
        </div>
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          ref={quickAddRef}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder="Quick add a task, press N to focus this box"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {focusMode ? (
        <div className="space-y-2">
          {focusTasks.length === 0 && (
            <div className="text-gray-500 text-sm">No focus tasks picked yet. Star up to 3 below.</div>
          )}
          {focusTasks.map((t) => (
            <div key={t.id} className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 text-white">
              {t.title}
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="bg-white/5 rounded-2xl p-3 space-y-2 min-h-[200px]">
                    <div className="text-xs font-mono uppercase text-gray-400">{col.label}</div>
                    {tasks
                      .filter((t) => t.status === col.id)
                      .map((t, index) => (
                        <Draggable draggableId={t.id} index={index} key={t.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="bg-[#0F172A] border border-white/10 rounded-xl p-3 text-sm text-white space-y-2"
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
                                </div>
                              </div>

                              {t.subtasks && t.subtasks.length > 0 ? (
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
                              ) : (
                                <button
                                  onClick={() => breakDownTask(t.id)}
                                  disabled={breakingDownId === t.id}
                                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-400 disabled:opacity-50"
                                >
                                  {breakingDownId === t.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  {breakingDownId === t.id ? 'Breaking down…' : 'Break Down'}
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {focusOverlayIndex !== null && openTasks.length > 0 && (
        <FocusModeOverlay
          tasks={openTasks}
          startIndex={Math.min(focusOverlayIndex, openTasks.length - 1)}
          onClose={() => setFocusOverlayIndex(null)}
          onComplete={completeTask}
          onToggleSubtask={toggleSubtask}
          onBreakDown={breakDownTask}
        />
      )}
    </div>
  );
}
