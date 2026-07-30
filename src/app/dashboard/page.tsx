'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import {
  Wrench,
  Home,
  Landmark,
  Bot,
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
  Phone,
  X,
  CheckCircle2,
  ChevronDown,
  Inbox,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';

// ─── TYPES ───
type UserRole = 'owner' | 'manager' | 'tech';
type LeadStatus = 'won' | 'in_progress' | 'lost' | 'pending' | 'spam';
type LeadSource = 'google_maps' | 'google_lsa' | 'organic_web' | 'truck_wrap';
type FmsStatus = 'synced' | 'manual_needed' | 'not_applicable';

interface ClientAccount {
  id: string;
  name: string;
  industry: string;
  logo: LucideIcon;
  retainer: number;
}

interface ActivityFeedItem {
  id: string;
  clientId: string;
  customerName: string;
  phone: string;
  address?: string;
  timestamp: string;
  jobCategory: string;
  badge: string;
  badgeIcon: LucideIcon;
  estimatedValue: number;
  closedValue?: number;
  status: LeadStatus;
  unrepliedMinutes?: number;
  isVip?: boolean;
  issueSummary?: string;
}

// Multi-Tenant Client Accounts List
const CLIENT_ACCOUNTS: ClientAccount[] = [
  { id: 'apex-plumbing', name: 'Apex Mechanical', industry: 'HVAC & Plumbing', logo: Wrench, retainer: 599 },
  { id: 'summit-roofing', name: 'Summit Roofing Co.', industry: 'Roofing & Exteriors', logo: Home, retainer: 850 },
  { id: 'trk-ministries', name: 'TRK Ministries', industry: 'Non-Profit / Outreach', logo: Landmark, retainer: 400 },
];

const DEMO_FEED_ITEMS: ActivityFeedItem[] = [
  {
    id: 'demo-1',
    clientId: 'apex-plumbing',
    customerName: 'Mark Johnson',
    phone: '555-019-2834',
    address: '104 Main Street, Alexandria, MN',
    timestamp: '10:42 PM',
    jobCategory: 'Water Heater Replacement',
    badge: 'AI Intercept',
    badgeIcon: Bot,
    estimatedValue: 1800,
    closedValue: 1800,
    status: 'won',
    unrepliedMinutes: 0,
    isVip: true,
    issueSummary: '50-Gal Water Heater actively leaking in basement.',
  },
  {
    id: 'demo-2',
    clientId: 'apex-plumbing',
    customerName: 'Sarah Miller',
    phone: '555-882-1049',
    address: '410 Maple Ave, Alexandria, MN',
    timestamp: '6:15 PM',
    jobCategory: 'AC Tune-Up Inspection',
    badge: 'Drip Reply',
    badgeIcon: TrendingUp,
    estimatedValue: 450,
    status: 'pending',
    unrepliedMinutes: 28,
    issueSummary: 'Requested $79 Seasonal AC Tune-Up Inspection.',
  },
  {
    id: 'demo-3',
    clientId: 'summit-roofing',
    customerName: 'David Thompson',
    phone: '555-392-1100',
    address: '882 Oak Lane, Alexandria, MN',
    timestamp: '2:15 PM',
    jobCategory: 'Roof Leak Inspection',
    badge: 'Storm Response',
    badgeIcon: AlertTriangle,
    estimatedValue: 3400,
    status: 'pending',
    unrepliedMinutes: 12,
    issueSummary: 'Missing shingles on west roof ridge after hail storm.',
  },
];

export default function SwitchableOperationalPortal() {
  const [activeClient, setActiveClient] = useState<ClientAccount>(CLIENT_ACCOUNTS[0]);
  const [activeTab, setActiveTab] = useState<'command' | 'telemetry'>('command');
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(DEMO_FEED_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'won'>('all');

  // Mobile focused lead & multi-select states
  const [mobileFocusedLead, setMobileFocusedLead] = useState<ActivityFeedItem | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Filter feed items by CURRENT ACTIVE CLIENT & search query
  const clientFeed = useMemo(() => {
    return activityFeed.filter((item) => {
      if (item.clientId !== activeClient.id) return false;

      const matchesSearch =
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobCategory.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeFilter === 'pending') return item.status === 'pending';
      if (activeFilter === 'won') return item.status === 'won';
      return true;
    });
  }, [activityFeed, activeClient.id, searchQuery, activeFilter]);

  const updateLeadStatus = (id: string, newStatus: LeadStatus) => {
    setActivityFeed((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    toast.success(`Updated status to ${newStatus.toUpperCase()}`);
  };

  const totalWonRevenue = useMemo(() => {
    return activityFeed
      .filter((i) => i.clientId === activeClient.id && i.status === 'won')
      .reduce((sum, item) => sum + (item.closedValue || item.estimatedValue), 0);
  }, [activityFeed, activeClient.id]);

  const filterCounts = useMemo(() => {
    const base = activityFeed.filter((item) => {
      if (item.clientId !== activeClient.id) return false;
      return (
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobCategory.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
    return {
      all: base.length,
      pending: base.filter((i) => i.status === 'pending').length,
      won: base.filter((i) => i.status === 'won').length,
    };
  }, [activityFeed, activeClient.id, searchQuery]);

  const ActiveLogo = activeClient.logo;

  return (
    <div className="admin-console min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-28 pt-[max(12px,env(safe-area-inset-top))] px-3 max-w-lg mx-auto">

      {/* CLIENT WORKSPACE CONTEXT SWITCHER HEADER */}
      <header className="py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl">
            <ActiveLogo className="w-5 h-5 text-indigo-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold font-mono tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              ACTIVE WORKSPACE
            </div>

            {/* Client Selector Dropdown */}
            <div className="relative inline-flex items-center max-w-full">
              <select
                value={activeClient.id}
                onChange={(e) => {
                  const found = CLIENT_ACCOUNTS.find((c) => c.id === e.target.value);
                  if (found) {
                    setActiveClient(found);
                    setMobileFocusedLead(null);
                    setSelectedLeadIds([]);
                    toast.info(`Switched active context to ${found.name}`);
                  }
                }}
                className="appearance-none bg-transparent min-w-0 max-w-full text-lg font-bold text-white outline-none cursor-pointer pr-5 border-none font-sans truncate"
              >
                {CLIENT_ACCOUNTS.map((client) => (
                  <option key={client.id} value={client.id} className="bg-slate-900 text-white">
                    {client.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-0 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-500 truncate">{activeClient.industry}</p>
          </div>
        </div>
      </header>

      {/* Client KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <div className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-400 font-medium">Client Retainer</span>
          </div>
          <span className="text-xl font-bold text-white font-mono tabular-nums">${activeClient.retainer}/mo</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-slate-400 font-medium">Closed Revenue</span>
          </div>
          <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
            ${totalWonRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Search & Quick Filters */}
      <div className="space-y-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeClient.name} leads...`}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <div className="flex gap-1.5 text-xs">
          {(['all', 'pending', 'won'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 py-1.5 rounded-xl font-medium capitalize transition text-center ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {filter} <span className="opacity-70 font-mono tabular-nums">({filterCounts[filter]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Streamlined Lead Cards */}
      <div className="space-y-3">
        {clientFeed.length === 0 ? (
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-2">
            <Inbox className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-xs">
              No active leads matching filter for {activeClient.name}.
            </p>
          </div>
        ) : (
          clientFeed.map((item) => {
            const BadgeIcon = item.badgeIcon;
            return (
            <div
              key={item.id}
              onClick={() => setMobileFocusedLead(mobileFocusedLead?.id === item.id ? null : item)}
              className={`p-3 bg-slate-900/90 border rounded-2xl space-y-3 backdrop-blur-md transition cursor-pointer ${
                mobileFocusedLead?.id === item.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                    <BadgeIcon className="w-3 h-3" />
                    {item.badge}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5 truncate">{item.customerName}</h3>
                  <p className="text-xs text-slate-400">{item.jobCategory}</p>
                </div>

                <span className="shrink-0 text-sm font-mono tabular-nums font-bold text-emerald-400">
                  ${item.estimatedValue}
                </span>
              </div>

              {item.issueSummary && (
                <div className="p-2.5 bg-slate-950/80 rounded-xl text-xs space-y-1 border border-slate-800/80 text-slate-300">
                  {item.issueSummary}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <a
                  href={`tel:${item.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLeadStatus(item.id, 'won');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition ${
                    item.status === 'won'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.status === 'won' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Won
                    </>
                  ) : (
                    'Mark Won'
                  )}
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* CONSOLIDATED DYNAMIC BOTTOM DOCK */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 p-2.5 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-2xl z-50 flex justify-around text-xs font-semibold shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        {selectedLeadIds.length > 0 ? (
          /* State 1: Multi-Select Actions */
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-indigo-400 font-mono tabular-nums">{selectedLeadIds.length} Selected</span>
            <button onClick={() => setSelectedLeadIds([])} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Won
            </button>
            <button onClick={() => setSelectedLeadIds([])} className="text-slate-400 hover:text-slate-200 px-2">Cancel</button>
          </div>
        ) : mobileFocusedLead ? (
          /* State 2: Active Lead Action Bar */
          <div className="flex items-center justify-between w-full px-2">
            <span className="truncate max-w-[120px] text-white font-bold">{mobileFocusedLead.customerName}</span>
            <div className="flex items-center gap-2">
              <a href={`tel:${mobileFocusedLead.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>
              <button onClick={() => setMobileFocusedLead(null)} className="text-slate-400 hover:text-slate-200 p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Primary Viewport Controls */
          <>
            <button
              onClick={() => setActiveTab('command')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors hover:bg-slate-800/80 ${
                activeTab === 'command' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Command</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors hover:bg-slate-800/80 ${
                activeTab === 'telemetry' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Telemetry</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}