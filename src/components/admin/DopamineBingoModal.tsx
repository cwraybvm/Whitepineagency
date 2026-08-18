'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Loader2 } from 'lucide-react';
import { getCompletedLines, isFullBoardComplete, type BingoPeriod } from '@/lib/bingo';

interface BingoCell {
  index: number;
  id: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

interface BingoBoardData {
  period: BingoPeriod;
  seedKey: string;
  cells: BingoCell[];
}

interface DopamineBingoModalProps {
  onClose: () => void;
}

const TABS: { id: BingoPeriod; label: string }[] = [
  { id: 'DAILY', label: "Today's Card" },
  { id: 'WEEKLY', label: "This Week's Card" },
];

function sameLine(a: number[], b: number[]): boolean {
  return a.join() === b.join();
}

export default function DopamineBingoModal({ onClose }: DopamineBingoModalProps) {
  const [tab, setTab] = useState<BingoPeriod>('DAILY');
  const [boards, setBoards] = useState<Partial<Record<BingoPeriod, BingoBoardData>>>({});
  const [loading, setLoading] = useState(true);
  const prevCompletedRef = useRef<Partial<Record<BingoPeriod, boolean[]>>>({});

  function celebrate(board: BingoBoardData) {
    const completed = board.cells.map((c) => c.completed);
    const prev = prevCompletedRef.current[board.period];
    if (prev) {
      const newLines = getCompletedLines(completed).filter((line) => !getCompletedLines(prev).some((p) => sameLine(p, line)));
      if (isFullBoardComplete(completed) && !isFullBoardComplete(prev)) {
        confetti({ particleCount: 300, spread: 120, origin: { y: 0.5 } });
      } else if (newLines.length > 0) {
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
      } else if (completed.some((c, i) => c && !prev[i])) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    }
    prevCompletedRef.current[board.period] = completed;
  }

  async function load(period: BingoPeriod) {
    const res = await fetch(`/api/bingo?period=${period}`);
    if (!res.ok) return;
    const data: BingoBoardData = await res.json();
    celebrate(data);
    setBoards((prev) => ({ ...prev, [period]: data }));
  }

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function toggleCell(cell: BingoCell) {
    if (cell.current >= cell.target) return; // auto-completed by real progress, not manually togglable
    const res = await fetch('/api/bingo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: tab, cellIndex: cell.index, completed: !cell.completed }),
    });
    if (!res.ok) return;
    const data: BingoBoardData = await res.json();
    celebrate(data);
    setBoards((prev) => ({ ...prev, [tab]: data }));
  }

  const board = boards[tab];

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">🎯 Dopamine Bingo</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                tab === t.id ? 'bg-white text-black' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading || !board ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {board.cells.map((cell) => (
              <button
                key={cell.index}
                onClick={() => toggleCell(cell)}
                disabled={cell.current >= cell.target}
                className={`aspect-square rounded-xl border p-2 text-[11px] font-medium leading-snug flex flex-col items-center justify-center text-center gap-1 transition-colors ${
                  cell.completed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <span>{cell.completed ? '✅' : '⬜'}</span>
                <span>{cell.label}</span>
                <span className="text-[10px] text-gray-500">
                  {cell.current}/{cell.target}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
