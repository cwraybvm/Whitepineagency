'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  BarChart3,
  Calculator,
  FileText,
  Gauge,
  Plus,
  FolderUp,
  Printer,
  Target,
  Star,
  Kanban,
  Building2,
  DollarSign,
  PhoneCall,
  Zap,
  Calendar,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';

interface Lead {
  id: string;
  businessName: string;
  url: string;
  email: string;
  phone: string;
  overallScore: number;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commandQuery: string;
  setCommandQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsQuoteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsBattleCardsOpen: () => void;
  leads: Lead[];
  openWorkspaceMatrix: (lead: Lead) => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  action: () => void;
  group: 'Navigate' | 'Actions' | 'Leads';
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  commandQuery,
  setCommandQuery,
  setIsQuoteModalOpen,
  setIsBattleCardsOpen,
  leads = [],
  openWorkspaceMatrix,
}: CommandPaletteModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const go = (path: string) => {
    router.push(path);
    onClose();
  };

  const staticItems: CommandItem[] = [
    // --- Navigation Items ---
    { id: 'nav-importer', label: 'CSV / Directory Lead Importer', hint: '/admin/import', icon: UploadCloud, action: () => go('/admin/import'), group: 'Navigate' },
    { id: 'nav-revenue', label: 'Retainer & Revenue Console', hint: '/admin/revenue', icon: DollarSign, action: () => go('/admin/revenue'), group: 'Navigate' },
    { id: 'nav-simulator', label: 'Missed Call Text-Back Simulator', hint: '/admin/simulator', icon: PhoneCall, action: () => go('/admin/simulator'), group: 'Navigate' },
    { id: 'nav-onboarding', label: 'Client Onboarding Generator', hint: '/admin/onboarding', icon: Zap, action: () => go('/admin/onboarding'), group: 'Navigate' },
    { id: 'nav-calendar', label: 'Mini Content Calendar', hint: '/admin/content-calendar', icon: Calendar, action: () => go('/admin/content-calendar'), group: 'Navigate' },
    { id: 'nav-pipeline', label: 'Pipeline Console', hint: '/admin', icon: LayoutDashboard, action: () => go('/admin'), group: 'Navigate' },
    { id: 'nav-fulfillment', label: 'Fulfillment Board', hint: '/fulfillment', icon: Kanban, action: () => go('/fulfillment'), group: 'Navigate' },
    { id: 'nav-flyer', label: 'Offer & Flyer Generator', hint: '/admin/flyer-generator', icon: Printer, action: () => go('/admin/flyer-generator'), group: 'Navigate' },
    { id: 'nav-intake', label: 'Client Intake Form', hint: '/intake', icon: FolderUp, action: () => go('/intake'), group: 'Navigate' },
    { id: 'nav-audit', label: 'Prospect Audit Helper', hint: '/audit/apex-mechanical', icon: Target, action: () => go('/audit/apex-mechanical'), group: 'Navigate' },
    { id: 'nav-reviews', label: 'Review Request System', hint: '/portal/reviews', icon: Star, action: () => go('/portal/reviews'), group: 'Navigate' },
    { id: 'nav-analytics', label: 'Telemetry Analytics', hint: '/admin/analytics', icon: BarChart3, action: () => go('/admin/analytics'), group: 'Navigate' },
    { id: 'nav-reports', label: 'Reports', hint: '/admin/reports', icon: FileText, action: () => go('/admin/reports'), group: 'Navigate' },
    { id: 'nav-dashboard', label: 'Client Dashboard', hint: '/portal/dashboard', icon: Gauge, action: () => go('/portal/dashboard'), group: 'Navigate' },

    // --- Actions ---
    { id: 'action-new-quote', label: 'Create New Quote', hint: 'Alt+Q', icon: Calculator, action: () => { setIsQuoteModalOpen(true); onClose(); }, group: 'Actions' },
    { id: 'action-battle-cards', label: 'Open Battle Cards', icon: Plus, action: () => { setIsBattleCardsOpen(); onClose(); }, group: 'Actions' },
  ];

  const query = commandQuery.toLowerCase();
  const filteredItems = staticItems.filter((item) => item.label.toLowerCase().includes(query));
  const filteredLeads = query
    ? leads.filter((lead) => lead.businessName?.toLowerCase().includes(query) || lead.url?.toLowerCase().includes(query)).slice(0, 5)
    : [];

  const groups: Array<'Leads' | 'Navigate' | 'Actions'> = ['Leads', 'Navigate', 'Actions'];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[calc(max(20px,env(safe-area-inset-top))+60px)] p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            placeholder="Jump to a page, run an action, or find a lead..."
            className="w-full bg-transparent text-white outline-none text-xs font-mono placeholder-slate-500"
          />
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold shrink-0">ESC</span>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {groups.map((group) => {
            if (group === 'Leads') {
              if (filteredLeads.length === 0) return null;
              return (
                <div key={group}>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2 block mb-1">
                    Leads
                  </span>
                  <div className="space-y-0.5">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => { openWorkspaceMatrix(lead); onClose(); }}
                        className="w-full p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer flex justify-between items-center text-slate-200 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          {lead.businessName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">{lead.url}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            const groupItems = filteredItems.filter((i) => i.group === group);
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
          {filteredItems.length === 0 && filteredLeads.length === 0 && (
            <p className="text-center text-slate-500 py-6 text-xs">No matches</p>
          )}
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