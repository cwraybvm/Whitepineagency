'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Fira_Code } from 'next/font/google';
import { Search, Filter, Phone, Mail, Calculator, Users, Clock, Loader2, Send, MessageSquare } from 'lucide-react';
import LeadChatDrawer from '@/components/crm/LeadChatDrawer';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

// Canonical pipeline vocabulary — shared with the admin Pipeline Console
// ((admin)/admin/page.tsx) against the same `Lead` table. Column labels here
// are demo-friendly; the underlying `stage` values must stay in sync with it.
type Stage = 'New Lead' | 'Pitched' | 'Proposal Sent' | 'Closed Won';
const STAGES: { value: Stage; label: string }[] = [
  { value: 'New Lead', label: 'New Leads' },
  { value: 'Pitched', label: 'Contacted' },
  { value: 'Proposal Sent', label: 'Proposal Sent' },
  { value: 'Closed Won', label: 'Closed Won' },
];

const ORG_ID = 'default-tenant-workspace';

interface Lead {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  industry: string;
  estimatedLoss: number;
  aiPriority: string;
  stage: Stage | string;
  updatedAt: string;
}

function priorityStyle(aiPriority: string) {
  const p = aiPriority.toLowerCase();
  if (p.includes('urgent') || p.includes('hot')) {
    return { text: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30' };
  }
  if (p.includes('cold') || p.includes('low')) {
    return { text: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/30' };
  }
  return { text: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
}

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [sendingSequenceId, setSendingSequenceId] = useState<string | null>(null);
  const [chatLead, setChatLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads?orgId=${ORG_ID}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const payload = data.leads || data;
      if (Array.isArray(payload)) setLeads(payload);
    } catch {
      toast.error('Failed to load pipeline leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateStage = async (id: string, newStage: Stage) => {
    const previousLeads = leads;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === newStage) return;

    // Optimistic move — UI reflects the new column immediately.
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l)));

    try {
      const res = await fetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(`Moved "${lead.businessName}" to "${newStage}"`);
    } catch {
      setLeads(previousLeads);
      toast.error(`Failed to move "${lead.businessName}" — reverted`);
    }
  };

  const triggerEmailSequence = async (lead: Lead) => {
    if (sendingSequenceId) return;
    setSendingSequenceId(lead.id);

    try {
      const res = await fetch('/api/leads/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: `Following up on your proposal — ${lead.businessName}`,
          body:
            `Hi ${lead.businessName} team,\n\n` +
            `Wanted to follow up on the proposal we sent over. Happy to answer any questions ` +
            `or jump on a quick call to walk through next steps.\n\n` +
            `Looking forward to hearing from you.\n\n— White Pine Agency`,
        }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      toast.success(`Follow-up sequence sent to "${lead.businessName}"`);
    } catch {
      toast.error(`Failed to send sequence to "${lead.businessName}"`);
    } finally {
      setSendingSequenceId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDragLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || dragLeadId;
    if (leadId) updateStage(leadId, stage);
    setDragLeadId(null);
  };

  const priorities = Array.from(new Set(leads.map((l) => l.aiPriority).filter(Boolean)));

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || l.aiPriority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const totalPipelineValue = filteredLeads.reduce((sum, l) => sum + (l.estimatedLoss || 0), 0);

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
              {loading ? (
                'Loading pipeline…'
              ) : (
                <>
                  {filteredLeads.length} leads ·{' '}
                  <span className="text-emerald-400 font-mono">
                    ${totalPipelineValue.toLocaleString()}
                  </span>{' '}
                  in view
                </>
              )}
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
              placeholder="Search business or industry..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500 ml-1 mr-1" />
            {['All', ...priorities].map((p) => (
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
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading leads from database…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAGES.map(({ value: stage, label }) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage);
              const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimatedLoss || 0), 0);

              return (
                <div
                  key={stage}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 min-h-[600px]"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {label}
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
                      const p = priorityStyle(lead.aiPriority);

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-all shadow-md cursor-grab active:cursor-grabbing ${
                            dragLeadId === lead.id
                              ? 'border-emerald-500/50 opacity-60'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Priority & Value */}
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span
                              className={`px-2 py-0.5 rounded font-bold border ${p.bg} ${p.text} ${p.border}`}
                            >
                              {lead.aiPriority || 'Stable'}
                            </span>
                            <span className="font-bold text-emerald-400">
                              ${(lead.estimatedLoss || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Title & Industry */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {lead.businessName}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">{lead.industry}</p>
                          </div>

                          {/* Direct Contact Row */}
                          <div className="flex items-center gap-3 text-[10px] font-mono pt-1 text-slate-400 border-t border-slate-900">
                            <a
                              href={`tel:${lead.phone}`}
                              className="hover:text-emerald-400 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" /> {lead.phone}
                            </a>
                            <a
                              href={`mailto:${lead.email}`}
                              className="hover:text-emerald-400 flex items-center gap-1 truncate"
                            >
                              <Mail className="w-3 h-3 text-emerald-400" /> Email
                            </a>
                          </div>

                          {/* Chat History */}
                          <button
                            onClick={() => setChatLead(lead)}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-[10px] font-mono transition-all flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" /> View Chat History
                          </button>

                          {/* Last Updated */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                            <Clock className="w-3 h-3" /> Updated: {formatTimestamp(lead.updatedAt)}
                          </div>

                          {/* Proposal Sent: automated follow-up sequence trigger */}
                          {lead.stage === 'Proposal Sent' && (
                            <button
                              onClick={() => triggerEmailSequence(lead)}
                              disabled={sendingSequenceId === lead.id}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[10px] font-mono transition-all flex items-center justify-center gap-1.5"
                            >
                              {sendingSequenceId === lead.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              {sendingSequenceId === lead.id ? 'Sending…' : 'Send Follow-Up Sequence'}
                            </button>
                          )}

                          {/* Stage Selector (accessible alternative to drag) */}
                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-mono">Stage:</span>
                            <select
                              value={lead.stage}
                              onChange={(e) => updateStage(lead.id, e.target.value as Stage)}
                              className="bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-emerald-500 font-mono"
                            >
                              {STAGES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
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
        )}
      </div>

      <LeadChatDrawer isOpen={!!chatLead} onClose={() => setChatLead(null)} lead={chatLead} />
    </div>
  );
}
