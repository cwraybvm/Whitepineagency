'use client';

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
  onToggleAxis: (taskId: string, axis: 'isUrgent' | 'isImportant') => void;
  onMove: (taskId: string, isUrgent: boolean, isImportant: boolean) => void;
}

export default function RooseveltMatrix({ tasks, onToggleAxis, onMove }: RooseveltMatrixProps) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dest = QUADRANTS.find((q) => q.id === result.destination!.droppableId);
    if (!dest) return;
    onMove(result.draggableId, dest.isUrgent, dest.isImportant);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => (
          <Droppable droppableId={q.id} key={q.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`rounded-2xl p-3 space-y-2 min-h-[180px] border ${q.classes}`}
              >
                <div className="text-xs font-mono uppercase text-gray-400">
                  {q.emoji} {q.title} <span className="text-gray-600 normal-case">— {q.subtitle}</span>
                </div>
                {tasks
                  .filter((t) => quadrantFor(t).id === q.id)
                  .map((t, index) => (
                    <Draggable draggableId={t.id} index={index} key={t.id}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="bg-[#0F172A] border border-white/10 rounded-xl text-sm text-white p-3 space-y-2"
                        >
                          <div>{t.title}</div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onToggleAxis(t.id, 'isUrgent')}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                                t.isUrgent
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : 'border-white/10 text-gray-600 hover:text-gray-400'
                              }`}
                            >
                              🔴 Urgent
                            </button>
                            <button
                              onClick={() => onToggleAxis(t.id, 'isImportant')}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                                t.isImportant
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                  : 'border-white/10 text-gray-600 hover:text-gray-400'
                              }`}
                            >
                              🔵 Important
                            </button>
                          </div>
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
  );
}
