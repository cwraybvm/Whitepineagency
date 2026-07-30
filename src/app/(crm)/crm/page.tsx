'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Fira_Code } from 'next/font/google';
import {
  Search,
  Filter,
  Phone,
  Mail,
  Flame,
  Sun,
  Snowflake,
  Calculator,
  Users,
  Clock,
} from 'lucide-react';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

type Stage = 'New Leads' | 'Contacted' | 'Proposal Sent' | 'Closed Won';
type Priority = 'Hot' | 'Warm' | 'Cold';

interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  value: number;
  priority: Priority;
  stage: Stage;
  lastContactedAt: string;
}

const STAGES: Stage[] = ['New Leads', 'Contacted', 'Proposal Sent', 'Closed Won'];
const PRIORITIES: Priority[] = ['Hot', 'Warm', 'Cold'];

const PRIORITY_STYLE: Record<Priority, { text: string; bg: string; border: string; icon: typeof Flame }> = {
  Hot: { text: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30', icon: Flame },
  Warm: { text: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: Sun },
  Cold: { text: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/30', icon: Snowflake },
};

const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    businessName: 'Apex Mechanical Services',
    contactName: 'Mark Stevens',
    phone: '(555) 234-5678',
    email: 'mark@apexmech.com',
    source: 'Google Maps',
    value: 1500,
    priority: 'Hot',
    stage: 'New Leads',
    lastContactedAt: '2026-07-29T14:32:00Z',
  },
  {
    id: '2',
    businessName: 'Northern Electric & Plumbing',
    contactName: 'Dave Miller',
    phone: '(555) 876-5432',
    email: 'info@northernelectric.com',
    source: 'Referral',
    value: 500,
    priority: 'Warm',
    stage: 'New Leads',
    lastContactedAt: '2026-07-28T09:10:00Z',
  },
  {
    id: '3',
    businessName: 'Cascade HVAC Solutions',
    contactName: 'Sarah Jenkins',
    phone: '(555) 345-6789',
    email: 'service@cascadehvac.com',
    source: 'Website',
    value: 1500,
    priority: 'Hot',
    stage: 'Contacted',
    lastContactedAt: '2026-07-30T11:05:00Z',
  },
  {
    id: '4',
    businessName: 'Redwood Roofing Co.',
    contactName: 'Ben Torres',
    phone: '(555) 654-3210',
    email: 'ben@redwoodroofing.com',
    source: 'Google LSA',
    value: 900,
    priority: 'Warm',
    stage: 'Contacted',
    lastContactedAt: '2026-07-27T16:45:00Z',
  },
  {
    id: '5',
    businessName: 'Blue Ridge Landscaping',
    contactName: 'Amy Chen',
    phone: '(555) 987-1234',
    email: 'amy@blueridgeland.com',
    source: 'Truck Wrap',
    value: 650,
    priority: 'Cold',
    stage: 'Proposal Sent',
    lastContactedAt: '2026-07-24T13:20:00Z',
  },
  {
    id: '6',
    businessName: 'Summit Roofing & Gutters',
    contactName: 'Chris Palmer',
    phone: '(555) 321-9876',
    email: 'chris@summitroof.com',
    source: 'Referral',
    value: 1200,
    priority: 'Hot',
    stage: 'Proposal Sent',
    lastContactedAt: '2026-07-30T08:00:00Z',
  },
  {
    id: '7',
    businessName: 'Ironclad Plumbing',
    contactName: 'Lena Ortiz',
    phone: '(555) 111-2222',
    email: 'lena@ironcladplumbing.com',
    source: 'Google Maps',
    value: 1500,
    priority: 'Hot',
    stage: 'Closed Won',
    lastContactedAt: '2026-07-20T10:00:00Z',
  },
];

const LOCAL_STORAGE_KEY = 'white_pine_crm_leads_v1';

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CrmPipelinePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setLeads(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved CRM state', e);
      }
    }
  }, []);

  const updateLeads = (next: Lead[]) => {
    setLeads(next);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  };

  const handleStageChange = (id: string, newStage: Stage) => {
    const updated = leads.map((l) =>
      l.id === id ? { ...l, stage: newStage, lastContactedAt: new Date().toISOString() } : l
    );
    updateLeads(updated);
    toast.success(`Moved lead to "${newStage}"`);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || l.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const totalPipelineValue = filteredLeads.reduce((sum, l) => sum + l.value, 0);

  return (
    <div
      className={`${firaCode.variable} min-h-screen bg-[#0F172A] text-gray-200 antialiased relative overflow-hidden`}
    >
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />

      <div className="relative z-10 p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> SALES &amp; LEADS
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">CRM Pipeline</h1>
            <p className="text-xs text-slate-400">
              {filteredLeads.length} leads · <span className="text-emerald-400 font-mono">${totalPipelineValue.toLocaleString()}/mo</span> in view
            </p>
          </div>

          <button
            onClick={() => router.push('/admin/quote')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" /> Open Solution Quoter
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search business, contact, or source..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500 ml-1 mr-1" />
            {(['All', ...PRIORITIES] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all ${
                  priorityFilter === p
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);

            return (
              <div
                key={stage}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 min-h-[600px]"
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {stage}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">
                      ${stageValue.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {stageLeads.map((lead) => {
                    const p = PRIORITY_STYLE[lead.priority];
                    const PriorityIcon = p.icon;

                    return (
                      <div
                        key={lead.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all shadow-md"
                      >
                        {/* Priority & Value */}
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 border ${p.bg} ${p.text} ${p.border}`}
                          >
                            <PriorityIcon className="w-3 h-3" /> {lead.priority}
                          </span>
                          <span className="font-bold text-emerald-400">
                            ${lead.value.toLocaleString()}/mo
                          </span>
                        </div>

                        {/* Title & Contact */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {lead.businessName}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-sans">
                            Contact: <strong className="text-slate-200">{lead.contactName}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">{lead.source}</p>
                        </div>

                        {/* Direct Contact Row */}
                        <div className="flex items-center gap-3 text-[10px] font-mono pt-1 text-slate-400 border-t border-slate-900">
                          <a href={`tel:${lead.phone}`} className="hover:text-emerald-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" /> {lead.phone}
                          </a>
                          <a
                            href={`mailto:${lead.email}`}
                            className="hover:text-emerald-400 flex items-center gap-1 truncate"
                          >
                            <Mail className="w-3 h-3 text-emerald-400" /> Email
                          </a>
                        </div>

                        {/* Last Contacted */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                          <Clock className="w-3 h-3" /> Last contact: {formatTimestamp(lead.lastContactedAt)}
                        </div>

                        {/* Stage Selector */}
                        <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-mono">Stage:</span>
                          <select
                            value={lead.stage}
                            onChange={(e) => handleStageChange(lead.id, e.target.value as Stage)}
                            className="bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-emerald-500 font-mono"
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

                  {stageLeads.length === 0 && (
                    <div className="p-8 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl font-mono">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
