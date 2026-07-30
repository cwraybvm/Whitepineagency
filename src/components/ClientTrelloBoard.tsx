'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, X, Calendar, User, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface TaskCard {
  id: string;
  title: string;
  description?: string;
  tagLabel?: string;
  tagColor?: string;
  dueDate?: string;
  assignee?: string;
  orderPosition?: number;
}

export interface BoardColumn {
  id: string;
  title: string;
  cards: TaskCard[];
}

interface ClientTrelloBoardProps {
  clientName: string;
  organizationId?: string;
  onClose?: () => void;
}

export default function ClientTrelloBoard({
  clientName,
  organizationId = 'default-org',
  onClose,
}: ClientTrelloBoardProps) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToColId, setAddingToColId] = useState<string | null>(null);

  // 1. Fetch Board Columns & Cards
  const fetchBoardState = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks?organizationId=${organizationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load board');

      setColumns(data.columns || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardState();
  }, [organizationId]);

  // 2. Drag & Drop Handler
  const handleOnDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newColumns = Array.from(columns);
    const sourceColIndex = newColumns.findIndex((c) => c.id === source.droppableId);
    const destColIndex = newColumns.findIndex((c) => c.id === destination.droppableId);

    if (sourceColIndex === -1 || destColIndex === -1) return;

    const sourceCol = newColumns[sourceColIndex];
    const destCol = newColumns[destColIndex];

    const sourceCards = Array.from(sourceCol.cards);
    const [movedCard] = sourceCards.splice(source.index, 1);

    if (sourceCol === destCol) {
      sourceCards.splice(destination.index, 0, movedCard);
      newColumns[sourceColIndex] = { ...sourceCol, cards: sourceCards };
    } else {
      const destCards = Array.from(destCol.cards);
      destCards.splice(destination.index, 0, movedCard);
      newColumns[sourceColIndex] = { ...sourceCol, cards: sourceCards };
      newColumns[destColIndex] = { ...destCol, cards: destCards };
    }

    // Optimistic Update
    setColumns(newColumns);

    // Sync to Server
    try {
      const columnUpdates = newColumns.map((col) => ({
        columnId: col.id,
        cardIds: col.cards.map((c) => c.id),
      }));

      const res = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, columnUpdates }),
      });

      if (!res.ok) throw new Error('Database sync failed');
    } catch {
      toast.error('Failed to sync layout changes with server.');
      fetchBoardState();
    }
  };

  // 3. Add New Card
  const handleAddNewTask = async (colId: string) => {
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle('');
    setAddingToColId(null);

    try {
      const res = await fetch('/api/tasks/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          columnId: colId,
          title,
          tagLabel: 'General',
          tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      toast.success('Task created!');
      fetchBoardState();
    } catch (err: any) {
      toast.error(err.message || 'Error creating task');
    }
  };

  // 4. Delete Card
  const handleDeleteTask = async (cardId: string) => {
    try {
      const res = await fetch(`/api/tasks/card?cardId=${cardId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');

      toast.success('Task removed');
      fetchBoardState();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting task');
    }
  };

  return (
    <div className="bg-[#080E1A] border border-white/15 rounded-3xl p-6 font-mono text-xs space-y-4 shadow-2xl backdrop-blur-xl">
      {/* Board Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 font-extrabold uppercase text-[10px]">Project Management</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 font-sans">{clientName}</span>
          </div>
          <h2 className="text-lg font-black text-white font-sans mt-0.5">Trello Workspace</h2>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Syncing tasks from database...</span>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto no-scrollbar pt-2">
            {columns.map((column) => (
              <div key={column.id} className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 flex flex-col space-y-3 min-h-[350px] shadow-lg backdrop-blur-md">
                {/* Column Title */}
                <div className="flex justify-between items-center px-1">
                  <span className="font-bold text-gray-200 uppercase text-[11px] font-sans flex items-center gap-1.5">
                    {column.title}
                  </span>
                  <span className="bg-white/10 text-gray-300 text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {column.cards.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2.5 flex-1 p-1 rounded-xl transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-950/30 border border-indigo-500/30' : ''
                      }`}
                    >
                      {column.cards.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white/[0.05] border border-white/10 hover:border-indigo-500/50 p-3.5 rounded-xl space-y-2 shadow-md transition-all group relative ${
                                snapshot.isDragging ? 'rotate-2 scale-105 border-indigo-500 bg-slate-900 shadow-2xl z-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 p-1 transition-opacity"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {task.tagLabel && (
                                <div className="flex gap-1">
                                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${task.tagColor}`}>
                                    {task.tagLabel}
                                  </span>
                                </div>
                              )}

                              <h4 className="font-sans font-bold text-white text-xs leading-snug pr-4">{task.title}</h4>

                              {task.description && (
                                <p className="font-sans text-gray-400 text-[10px] leading-relaxed line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center justify-between text-gray-400 pt-1 text-[9px]">
                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-indigo-300 font-bold">
                                    <Calendar className="w-3 h-3" /> {task.dueDate}
                                  </span>
                                )}
                                {task.assignee && (
                                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-gray-200">
                                    <User className="w-2.5 h-2.5 text-emerald-400" /> {task.assignee}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add Card Input */}
                {addingToColId === column.id ? (
                  <div className="space-y-2 p-1 border-t border-white/10 pt-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Enter card title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewTask(column.id)}
                      className="w-full bg-slate-950 border border-indigo-500/50 p-2 text-white text-xs rounded-xl outline-none"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAddNewTask(column.id)}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase text-[9px]"
                      >
                        Add Card
                      </button>
                      <button
                        onClick={() => setAddingToColId(null)}
                        className="px-2 bg-white/10 text-gray-400 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToColId(column.id)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold rounded-xl flex items-center justify-center gap-1.5 text-[10px] uppercase transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" /> Add Card
                  </button>
                )}
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}