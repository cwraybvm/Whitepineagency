'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  Search, 
  Filter, 
  CheckSquare, 
  AlertCircle, 
  Send, 
  Printer, 
  Plus, 
  Phone,
  Mail,
  Clock,
  Sparkles,
  Tag,
  Eye,
  X
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface ClientDeliverable {
  id: string;
  clientName: string;
  ownerName: string;
  trade: 'HVAC' | 'Plumbing' | 'Electrical' | 'General Trade';
  serviceType: string;
  stage: 'Intake Pending' | 'Content Uploaded' | 'Setup Live' | 'Active Retainer';
  contractValue: number;
  driveFolderUrl?: string;
  daysInStage: number;
  contactEmail: string;
  contactPhone: string;
  checklist: ChecklistItem[];
  offerHeadline?: string;
  notes?: string;
}

const INITIAL_CLIENTS: ClientDeliverable[] = [
  {
    id: '1',
    clientName: 'Apex Mechanical Services',
    ownerName: 'Mark Stevens',
    trade: 'HVAC',
    serviceType: 'AI Receptionist + Review Pass',
    stage: 'Content Uploaded',
    contractValue: 1500,
    driveFolderUrl: 'https://drive.google.com',
    daysInStage: 1,
    contactEmail: 'mark@apexmech.com',
    contactPhone: '(555) 234-5678',
    offerHeadline: '$79 Seasonal AC Tune-Up Special',
    checklist: [
      { id: 'c1', label: 'Intake Form Submitted', done: true },
      { id: 'c2', label: 'Twilio Number Provisioned', done: true },
      { id: 'c3', label: 'Review QR Pass Printed', done: false },
      { id: 'c4', label: 'A2P 10DLC Registration', done: false },
    ],
    notes: 'Client uploaded logos and $79 AC tune-up offer.',
  },
  {
    id: '2',
    clientName: 'Northern Electric & Plumbing',
    ownerName: 'Dave Miller',
    trade: 'Electrical',
    serviceType: 'Local Visibility + Lead Capture',
    stage: 'Intake Pending',
    contractValue: 500,
    daysInStage: 4, // SLA breach alert (>3 days)
    contactEmail: 'info@northernelectric.com',
    contactPhone: '(555) 876-5432',
    offerHeadline: 'Free Main Panel Inspection with Service Call',
    checklist: [
      { id: 'c1', label: 'Intake Form Submitted', done: false },
      { id: 'c2', label: 'Twilio Number Provisioned', done: false },
      { id: 'c3', label: 'Review QR Pass Printed', done: false },
    ],
    notes: 'Waiting on owner to upload logo files.',
  },
  {
    id: '3',
    clientName: 'Cascade HVAC Solutions',
    ownerName: 'Sarah Jenkins',
    trade: 'HVAC',
    serviceType: 'Full Automation Retainer',
    stage: 'Active Retainer',
    contractValue: 1500,
    driveFolderUrl: 'https://drive.google.com',
    daysInStage: 14,
    contactEmail: 'service@cascadehvac.com',
    contactPhone: '(555) 345-6789',
    offerHeadline: '10% Off First Emergency Service Call',
    checklist: [
      { id: 'c1', label: 'Intake Form Submitted', done: true },
      { id: 'c2', label: 'Twilio Number Provisioned', done: true },
      { id: 'c3', label: 'Review QR Pass Printed', done: true },
      { id: 'c4', label: 'A2P 10DLC Registration', done: true },
    ],
    notes: 'Account active and healthy. Generating ~12 leads/wk.',
  },
];

const LOCAL_STORAGE_KEY = 'white_pine_fulfillment_clients_v2';

export default function UltimateFulfillmentPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientDeliverable[]>(INITIAL_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [showSlaBreachedOnly, setShowSlaBreachedOnly] = useState(false);
  
  // Asset Modal Preview
  const [activePreviewClient, setActivePreviewClient] = useState<ClientDeliverable | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setClients(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, []);

  const updateClientsState = (newClients: ClientDeliverable[]) => {
    setClients(newClients);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClients));
  };

  const handleStageChange = (id: string, newStage: ClientDeliverable['stage']) => {
    const updated = clients.map((c) =>
      c.id === id ? { ...c, stage: newStage, daysInStage: 0 } : c
    );
    updateClientsState(updated);
    toast.success(`Moved client to "${newStage}"`);
  };

  const toggleChecklistItem = (clientId: string, itemId: string) => {
    const updated = clients.map((c) => {
      if (c.id === clientId) {
        const updatedChecklist = c.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        return { ...c, checklist: updatedChecklist };
      }
      return c;
    });
    updateClientsState(updated);
  };

  const stages: ClientDeliverable['stage'][] = [
    'Intake Pending',
    'Content Uploaded',
    'Setup Live',
    'Active Retainer',
  ];

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = selectedTrade === 'All' || c.trade === selectedTrade;
    const matchesSla = !showSlaBreachedOnly || (c.stage !== 'Active Retainer' && c.daysInStage >= 3);
    return matchesSearch && matchesTrade && matchesSla;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">
      
      {/* Asset Preview Modal */}
      {activePreviewClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setActivePreviewClient(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono text-sky-400 uppercase">
                ASSET SUMMARY PREVIEW
              </span>
              <h3 className="text-lg font-bold text-white">{activePreviewClient.clientName}</h3>
              <p className="text-xs text-slate-400">Owner: {activePreviewClient.ownerName}</p>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Primary Offer Headline:</span>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">
                  {activePreviewClient.offerHeadline || 'No offer headline uploaded yet'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Internal Production Notes:</span>
                <p className="text-slate-300 mt-0.5">{activePreviewClient.notes || 'None'}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] font-mono">
                <span>Value: <strong className="text-white">${activePreviewClient.contractValue}/mo</strong></span>
                {activePreviewClient.driveFolderUrl && (
                  <a
                    href={activePreviewClient.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <FolderOpen className="w-3 h-3" /> Drive Folder ↗
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => setActivePreviewClient(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AGENCY OPERATIONAL MATRIX
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Client Service Fulfillment Board
          </h1>
          <p className="text-xs text-slate-400">
            Track client onboarding stages, SLA timers, and production assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/intake')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> Intake Portal
          </button>
          <button
            onClick={() => router.push('/admin/onboarding')}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Client Onboarding
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, owner, or service..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500 ml-1 mr-1" />
            {['All', 'HVAC', 'Plumbing', 'Electrical'].map((trade) => (
              <button
                key={trade}
                onClick={() => setSelectedTrade(trade)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all ${
                  selectedTrade === trade
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {trade}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSlaBreachedOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all flex items-center gap-1.5 ${
              showSlaBreachedOnly
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>SLA Breached (&gt;3d)</span>
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageClients = filteredClients.filter((c) => c.stage === stage);

          return (
            <div key={stage} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 min-h-[600px] flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {stage}
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                    {stageClients.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageClients.map((client) => {
                    const completedChecklistCount = client.checklist.filter((i) => i.done).length;
                    const progressPct = Math.round(
                      (completedChecklistCount / (client.checklist.length || 1)) * 100
                    );
                    const isSlaBreached = client.stage !== 'Active Retainer' && client.daysInStage >= 3;

                    return (
                      <div
                        key={client.id}
                        className={`bg-slate-950 border rounded-xl p-4 space-y-3 relative transition-all shadow-md ${
                          isSlaBreached ? 'border-rose-500/50 shadow-rose-950/20' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* SLA Timer & Value Bar */}
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                            isSlaBreached 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            <Clock className="w-3 h-3" /> {client.daysInStage}d in stage
                          </span>

                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> ${client.contractValue}/mo
                          </span>
                        </div>

                        {/* Title & Owner */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {client.clientName}
                            </h4>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-sky-400 rounded">
                              {client.trade}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans">
                            Owner: <strong className="text-slate-200">{client.ownerName}</strong>
                          </p>
                        </div>

                        {/* Direct Contact Row */}
                        <div className="flex items-center gap-3 text-[10px] font-mono pt-1 text-slate-400 border-t border-slate-900">
                          <a
                            href={`tel:${client.contactPhone}`}
                            className="hover:text-sky-400 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-sky-400" /> {client.contactPhone}
                          </a>
                          <a
                            href={`mailto:${client.contactEmail}`}
                            className="hover:text-sky-400 flex items-center gap-1 truncate"
                          >
                            <Mail className="w-3 h-3 text-sky-400" /> Email
                          </a>
                        </div>

                        {/* Task Checklist */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-slate-500" /> Tasks
                            </span>
                            <span>{completedChecklistCount}/{client.checklist.length} ({progressPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-sky-500 h-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Interactive Sub-items */}
                        <div className="space-y-1 pt-1 border-t border-slate-900">
                          {client.checklist.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleChecklistItem(client.id, item.id)}
                                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 w-3 h-3 cursor-pointer"
                              />
                              <span className={item.done ? 'line-through text-slate-500' : ''}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>

                        {/* Quick Tools & Asset Drawer Trigger */}
                        <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px]">
                          <button
                            onClick={() => setActivePreviewClient(client)}
                            className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview Assets
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push('/admin/flyer-generator')}
                              className="text-slate-400 hover:text-slate-200 font-mono"
                            >
                              Flyer
                            </button>
                            <button
                              onClick={() => router.push('/admin/onboarding')}
                              className="text-slate-400 hover:text-slate-200 font-mono"
                            >
                              Onboard
                            </button>
                          </div>
                        </div>

                        {/* Stage Selector */}
                        <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-mono">Stage:</span>
                          <select
                            value={client.stage}
                            onChange={(e) => handleStageChange(client.id, e.target.value as ClientDeliverable['stage'])}
                            className="bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-sky-500 font-mono"
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                      </div>
                    );
                  })}

                  {stageClients.length === 0 && (
                    <div className="p-8 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl font-mono">
                      No accounts in this stage
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}