'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface MatrixTask {
  id: string;
  title: string;
  isUrgent: boolean;
  isImportant: boolean;
}

interface Quadrant {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  isUrgent: boolean;
  isImportant: boolean;
  classes: string;
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'Q1',
    emoji: '🔴',
    title: 'Do First',
    subtitle: 'Urgent + Important',
    isUrgent: true,
    isImportant: true,
    classes: 'bg-red-500/5 border-red-500/20',
  },
  {
    id: 'Q2',
    emoji: '🔵',
    title: 'Schedule',
    subtitle: 'Not Urgent + Important',
    isUrgent: false,
    isImportant: true,
    classes: 'bg-sky-500/5 border-sky-500/20',
  },
  {
    id: 'Q3',
    emoji: '🟡',
    title: 'Delegate / Quick-Sweep',
    subtitle: 'Urgent + Not Important',
    isUrgent: true,
    isImportant: false,
    classes: 'bg-amber-500/5 border-amber-500/20',
  },
  {
    id: 'Q4',
    emoji: '⚪',
    title: 'Park / Eliminate',
    subtitle: 'Not Urgent + Not Important',
    isUrgent: false,
    isImportant: false,
    classes: 'bg-white/5 border-white/10',
  },
];

function quadrantFor(task: MatrixTask): Quadrant {
  return QUADRANTS.find((q) => q.isUrgent === task.isUrgent && q.isImportant === task.isImportant)!;
}

interface RooseveltMatrixProps {
  tasks: MatrixTask[];
  onMove: (taskId: string, isUrgent: boolean, isImportant: boolean) => void;
}

export default function RooseveltMatrix({ tasks, onMove }: RooseveltMatrixProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dest = QUADRANTS.find((q) => q.id === result.destination!.droppableId);
    if (!dest) return;
    onMove(result.draggableId, dest.isUrgent, dest.isImportant);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => {
          const quadrantTasks = tasks.filter((t) => quadrantFor(t).id === q.id);
          const isCollapsed = !!collapsed[q.id];
          return (
            <div key={q.id} className={`rounded-2xl border overflow-hidden ${q.classes}`}>
              <button
                type="button"
                onClick={() => toggleCollapsed(q.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-xs font-mono uppercase text-gray-400">
                  {q.emoji} {q.title} <span className="text-gray-600 normal-case">— {q.subtitle}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-gray-600">{quadrantTasks.length}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </span>
              </button>

              <Droppable droppableId={q.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`px-3 space-y-2 transition-all duration-300 ease-in-out ${
                      isCollapsed ? 'max-h-0 opacity-0 pb-0 pointer-events-none' : 'max-h-[2000px] opacity-100 pb-3'
                    }`}
                  >
                    {quadrantTasks.length === 0 && !isCollapsed && (
                      <div className="text-xs text-gray-600 py-2">No tasks here.</div>
                    )}
                    {quadrantTasks.map((t, index) => (
                      <Draggable draggableId={t.id} index={index} key={t.id}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="bg-[#0F172A] border border-white/10 rounded-xl text-sm text-white p-3 space-y-2"
                          >
                            <div className="break-words">{t.title}</div>
                            <div className="flex items-center gap-1">
                              {QUADRANTS.map((qq) => (
                                <button
                                  key={qq.id}
                                  type="button"
                                  onClick={() => onMove(t.id, qq.isUrgent, qq.isImportant)}
                                  title={`Move to ${qq.title} — ${qq.subtitle}`}
                                  className={`flex items-center justify-center min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 sm:w-6 sm:h-6 rounded-full border text-xs ${
                                    qq.id === q.id
                                      ? `ring-2 ring-white/40 ${qq.classes}`
                                      : `opacity-50 hover:opacity-100 ${qq.classes}`
                                  }`}
                                >
                                  {qq.emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
