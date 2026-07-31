'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  LayoutDashboard,
  BarChart3,
  Calculator,
  FileText,
  Gauge,
  Plus,
  SunMoon,
  Link2,
  FolderUp,
  Printer,
  Target,
  Star,
  Kanban,
  type LucideIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  action: () => void;
  group: 'Navigate' | 'Actions';
}

const PREVIEW_LIGHT_STORAGE_KEY = 'admin_preview_light';

export default function AdminCommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [previewLight, setPreviewLight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore light-preview toggle on mount.
  useEffect(() => {
    const stored = localStorage.getItem(PREVIEW_LIGHT_STORAGE_KEY) === '1';
    setPreviewLight(stored);
    document.documentElement.classList.toggle('preview-light', stored);
  }, []);

  const closePalette = useCallback(() => setIsOpen(false), []);

  const go = useCallback(
    (path: string) => {
      router.push(path);
      closePalette();
    },
    [router, closePalette]
  );

  const toggleDarkModePreview = useCallback(() => {
    setPreviewLight((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('preview-light', next);
      localStorage.setItem(PREVIEW_LIGHT_STORAGE_KEY, next ? '1' : '0');
      toast.info(next ? 'Light preview enabled' : 'Light preview disabled');
      return next;
    });
    closePalette();
  }, [closePalette]);

  const copyPortalLink = useCallback(() => {
    const link = `${window.location.origin}/portal`;
    navigator.clipboard.writeText(link);
    toast.success('Portal link copied to clipboard');
    closePalette();
  }, [closePalette]);

  // Global Cmd+K / Ctrl+K toggle + ESC to close.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // --- Navigation Items ---
    { id: 'nav-fulfillment', label: 'Fulfillment Board', hint: '/fulfillment', icon: Kanban, action: () => go('/fulfillment'), group: 'Navigate' },
    { id: 'nav-flyer', label: 'Offer & Flyer Generator', hint: '/fulfillment/flyer-generator', icon: Printer, action: () => go('/fulfillment/flyer-generator'), group: 'Navigate' },
    { id: 'nav-intake', label: 'Client Intake Form', hint: '/intake', icon: FolderUp, action: () => go('/intake'), group: 'Navigate' },
    { id: 'nav-audit', label: 'Prospect Audit Helper', hint: '/audit/apex-mechanical', icon: Target, action: () => go('/audit/apex-mechanical'), group: 'Navigate' },
    { id: 'nav-reviews', label: 'Review Request System', hint: '/portal/reviews', icon: Star, action: () => go('/portal/reviews'), group: 'Navigate' },
    { id: 'nav-pipeline', label: 'Pipeline Console', hint: '/admin', icon: LayoutDashboard, action: () => go('/admin'), group: 'Navigate' },
    { id: 'nav-analytics', label: 'Telemetry Analytics', hint: '/admin/analytics', icon: BarChart3, action: () => go('/admin/analytics'), group: 'Navigate' },
    { id: 'nav-quote', label: 'Solution Quoter', hint: '/admin/quote', icon: Calculator, action: () => go('/admin/quote'), group: 'Navigate' },
    { id: 'nav-reports', label: 'Reports', hint: '/admin/reports', icon: FileText, action: () => go('/admin/reports'), group: 'Navigate' },
    { id: 'nav-dashboard', label: 'Client Dashboard', hint: '/portal/dashboard', icon: Gauge, action: () => go('/portal/dashboard'), group: 'Navigate' },

    // --- Actions ---
    { id: 'action-new-quote', label: 'Create New Quote', hint: 'Alt+Q', icon: Plus, action: () => go('/admin/quote'), group: 'Actions' },
    { id: 'action-theme', label: previewLight ? 'Disable Light Preview' : 'Enable Light Preview', icon: SunMoon, action: toggleDarkModePreview, group: 'Actions' },
    { id: 'action-copy-portal', label: 'Copy Portal Link', icon: Link2, action: copyPortalLink, group: 'Actions' },
  ];

  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const groups: Array<'Navigate' | 'Actions'> = ['Navigate', 'Actions'];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[calc(max(20px,env(safe-area-inset-top))+60px)] p-4 font-mono text-xs"
      onClick={closePalette}
    >
      <div
        className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page or run an action..."
            className="w-full bg-transparent text-white outline-none text-xs font-mono placeholder-slate-500"
          />
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold shrink-0">ESC</span>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {groups.map((group) => {
            const groupItems = filtered.filter((i) => i.group === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2 block mb-1">
                  {group}
                </span>
                <div className="space-y-0.5">
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className="w-full p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer flex justify-between items-center text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {item.label}
                      </span>
                      {item.hint && <span className="text-[10px] text-slate-500 font-bold">{item.hint}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-slate-500 py-6 text-xs">No matches</p>}
        </div>

        <div className="border-t border-slate-800 px-3 py-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded font-bold">⌘K</span> to toggle
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded font-bold">ESC</span> to close
          </span>
        </div>
      </div>
    </div>
  );
}