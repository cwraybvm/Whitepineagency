'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Play, Square, Clock, Eye, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useBillingTimer } from '@/hooks/useBillingTimer';

interface BillingTimerWidgetProps {
  // "floating" (default) is the fixed-position pill every admin page gets
  // from the layout. "inline" renders as a plain flow element for pages
  // that want to dock it in their own header instead.
  variant?: 'floating' | 'inline';
}

interface ClientOption {
  id: string;
  name: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

type TimerDockState = 'expanded' | 'collapsed';
type TimerPosition = 'top-left' | 'top-right' | 'bottom-right';

const TIMER_STATE_KEY = 'timerState';
const TIMER_POSITION_KEY = 'timerPosition';

const POSITION_LABELS: Record<TimerPosition, string> = {
  'top-left': 'Top-Left',
  'top-right': 'Top-Right',
  'bottom-right': 'Bottom-Right',
};

// Each corner is contested by a different piece of chrome depending on
// breakpoint -- AdminNav's desktop sidebar (top-left, md+), its mobile-only
// floating ThemeToggle (top-right, <md), and its mobile bottom nav + Focus
// Mode button (bottom-right, <md). The offsets below nudge the widget clear
// of whichever one applies at that breakpoint instead of colliding with it.
const POSITION_CLASSES: Record<TimerPosition, string> = {
  'top-left': 'top-[calc(1rem+env(safe-area-inset-top))] left-4 md:left-[17rem]',
  'top-right': 'top-[calc(1rem+env(safe-area-inset-top))] right-4 max-md:top-[calc(4.5rem+env(safe-area-inset-top))]',
  'bottom-right': 'bottom-4 right-4 max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))]',
};

export default function BillingTimerWidget({ variant = 'floating' }: BillingTimerWidgetProps) {
  const pathname = usePathname();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const { active, elapsed, start, stop } = useBillingTimer();

  // Dock state/position only matter for the floating variant -- persisted so
  // the widget stays out of the way of whatever it was covering last time.
  const [dockState, setDockState] = useState<TimerDockState>('expanded');
  // AdminNav's mobile ThemeToggle floats at top-right (z-40) -- default here
  // to top-left so a fresh visitor doesn't get an immediate overlap on mobile.
  const [position, setPosition] = useState<TimerPosition>('top-left');
  const [positionMenuOpen, setPositionMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(TIMER_STATE_KEY);
      if (savedState === 'expanded' || savedState === 'collapsed') setDockState(savedState);
      const savedPosition = localStorage.getItem(TIMER_POSITION_KEY);
      if (savedPosition === 'top-left' || savedPosition === 'top-right' || savedPosition === 'bottom-right') {
        setPosition(savedPosition);
      }
    } catch {}
  }, []);

  function updateDockState(next: TimerDockState) {
    setDockState(next);
    try {
      localStorage.setItem(TIMER_STATE_KEY, next);
    } catch {}
  }

  function updatePosition(next: TimerPosition) {
    setPosition(next);
    setPositionMenuOpen(false);
    try {
      localStorage.setItem(TIMER_POSITION_KEY, next);
    } catch {}
  }

  useEffect(() => {
    fetch('/api/clients').then((res) => (res.ok ? res.json() : [])).then((list: ClientOption[]) => {
      setClients(list);
      if (list.length > 0) setSelectedClientId((prev) => prev || list[0].id);
    });
  }, []);

  useEffect(() => {
    if (active) setSelectedClientId(active.organizationId);
  }, [active]);

  async function handleStart() {
    if (!selectedClientId) {
      toast.error('Select a client first');
      return;
    }
    const result = await start(selectedClientId);
    if (!result.ok) toast.error(result.error);
  }

  async function handleStop() {
    const result = await stop();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Time entry saved as pending billable time');
  }

  // /admin/tasks docks its own inline instance in the page header instead --
  // suppress the floating one there so the timer never overlaps page content.
  if (variant === 'floating' && pathname === '/admin/tasks') return null;

  if (variant === 'floating' && dockState === 'collapsed') {
    return (
      <button
        onClick={() => updateDockState('expanded')}
        title="Expand billing timer"
        className={`fixed ${POSITION_CLASSES[position]} z-[150] w-10 h-10 rounded-full bg-[#080E1A] border border-white/20 shadow-2xl flex items-center justify-center text-emerald-400`}
      >
        {active ? (
          <span className="font-mono text-[9px] tabular-nums text-white">{formatElapsed(elapsed).slice(0, 5)}</span>
        ) : (
          <Clock className="w-4 h-4" />
        )}
      </button>
    );
  }

  const containerClassName =
    variant === 'inline'
      ? 'bg-[#080E1A] border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2 font-mono text-xs max-w-full overflow-x-auto shrink-0'
      : `fixed ${POSITION_CLASSES[position]} z-[150] bg-[#080E1A] border border-white/20 rounded-2xl shadow-2xl px-3 py-2 md:px-4 md:py-3 flex items-center gap-2 md:gap-3 font-mono text-xs max-w-[calc(100vw-2rem)] overflow-x-auto`;

  return (
    <div className={containerClassName}>
      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
      <select
        value={selectedClientId}
        onChange={(e) => setSelectedClientId(e.target.value)}
        disabled={!!active}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs disabled:opacity-50"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="text-white tabular-nums w-16 text-center">{formatElapsed(elapsed)}</span>
      {active ? (
        <button onClick={handleStop} className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-lg">
          <Square className="w-3 h-3" /> Stop
        </button>
      ) : (
        <button onClick={handleStart} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg">
          <Play className="w-3 h-3" /> Start
        </button>
      )}

      {variant === 'floating' && (
        <div className="flex items-center gap-1 shrink-0 border-l border-white/10 pl-2 ml-0.5">
          <div className="relative">
            <button
              onClick={() => setPositionMenuOpen((v) => !v)}
              title="Reposition timer"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
            {positionMenuOpen && (
              <>
                <div className="fixed inset-0 z-[151]" onClick={() => setPositionMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-[152] w-32 bg-[#0F172A] border border-white/10 rounded-xl shadow-xl p-1">
                  {(Object.keys(POSITION_LABELS) as TimerPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => updatePosition(pos)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] ${
                        pos === position ? 'text-emerald-400 bg-white/5' : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {POSITION_LABELS[pos]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => updateDockState('collapsed')}
            title="Minimize timer"
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
