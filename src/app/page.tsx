'use client';

import React, { useEffect, useState } from 'react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import QuotingEngine from '@/components/QuotingEngine';
import FloatingSmartDock from '@/components/admin/FloatingSmartDock';
import CommandPaletteModal from '@/components/admin/CommandPaletteModal';
import { 
  Building2, 
  Search, 
  Plus, 
  Download, 
  Table, 
  Kanban, 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Sparkle,
  Copy,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

type DealStage = 'New Lead' | 'Pitched' | 'Proposal Sent' | 'Closed Won' | 'Closed Lost';
type Industry = 'Home Services' | 'Legal & Law' | 'Dental & Medical' | 'B2B & SaaS';
type BrandTheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
type WorkspaceTab = 'pipeline' | 'pitch' | 'vault';

interface Lead {
  id: string;
  businessName: string;
  url: string;
  email: string;
  phone: string;
  overallScore: number;
  aiPriority?: string;
  aiOutreachScript?: string;
  stage?: DealStage;
  industry?: Industry;
  lastUpdated?: string;
  memo?: string;
}

interface ActivitySignal {
  id: string;
  timestamp: string;
  clientName: string;
  event: string;
}

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const playAudioChime = (type: 'copy' | 'win' | 'click' | 'success' | 'reset') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'win') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.25);
    } else if (type === 'copy' || type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    } else if (type === 'reset') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
    }
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Autoplay restrictions guard
  }
};

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Live Signals
  const [activityFeed, setActivityFeed] = useState<ActivitySignal[]>([
    { id: '1', timestamp: '10:14 AM', clientName: 'Strategic Target Node', event: 'Opened Audit Link (3rd View)' },
    { id: '2', timestamp: '10:22 AM', clientName: 'Apex Roofing Co.', event: 'Clicked "View e-Sign Contract"' }
  ]);

  // Tabs & Controls
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('pipeline');
  const [isConfigDeckCollapsed, setIsConfigDeckCollapsed] = useState(false);

  // Rescue Agent
  const [rescuingLeadId, setRescuingLeadId] = useState<string | null>(null);
  const [generatedRescuePlay, setGeneratedRescuePlay] = useState<string | null>(null);

  // Roleplay Simulator
  const [roleplayObjection] = useState<string>("Your monthly retainer seems pretty high for a small plumbing shop.");
  const [userRoleplayResponse, setUserRoleplayResponse] = useState<string>("");
  const [roleplayFeedback, setRoleplayFeedback] = useState<{ score: number; tip: string } | null>(null);

  // System States
  const [isOnline, setIsOnline] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // Filters
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [activeIndustry] = useState<Industry>('Home Services');

  // Voice Memo
  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [recentWorkspaceLeads, setRecentWorkspaceLeads] = useState<Lead[]>([]);

  // ROI Calculator
  const [averageLtv] = useState<number>(1500);
  const [monthlyTraffic] = useState<number>(5000);
  
  // Intake Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPriority] = useState('Stable');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Active Lead Workspace
  const [activeWorkspaceLead, setActiveWorkspaceLead] = useState<Lead | null>(null);
  const [wsName, setWsName] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [wsLoss, setWsLoss] = useState(2450);

  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const computedRevenueLeakage = Math.floor(monthlyTraffic * 0.30 * (averageLtv * 0.05));

  const handleTriggerDealRescueAgent = (lead: Lead) => {
    playAudioChime('win');
    setRescuingLeadId(lead.id);
    const rescueText = `Hey ${lead.businessName}! I noticed you revisited the diagnostic audit link today. Based on your $${computedRevenueLeakage.toLocaleString()}/mo leakage calculation, we can waive your initial onboarding fee if we finalize setup before Friday. Let me know if you want to review!`;
    setGeneratedRescuePlay(rescueText);
    triggerToast(`🤖 Rescue play generated for "${lead.businessName}"`, "success");
  };

  const handleEvaluateRoleplay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRoleplayResponse.trim()) return;

    playAudioChime('win');
    const responseLen = userRoleplayResponse.trim().length;
    const score = Math.min(96, Math.max(65, Math.floor(responseLen / 2) + 40));
    setRoleplayFeedback({
      score,
      tip: "Great framing on ROI! Next time, anchor the cost back to lost emergency service dispatches to overcome price resistance faster."
    });
  };

  const handleSyncToCrm = async (lead: Lead) => {
    playAudioChime('win');
    triggerToast(`⚡ Optimistic Sync: Pushed "${lead.businessName}" to CRM!`, "success");
  };

  const handleUpdateStage = (leadId: string, newStage: DealStage) => {
    if (newStage === 'Closed Won') playAudioChime('win');
    else playAudioChime('click');

    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    triggerToast(`🏷️ Updated stage to "${newStage}"`, "info");
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerToast("🟢 Back Online", "success"); };
    const handleOffline = () => { setIsOnline(false); triggerToast("🔴 Local Cache Active", "error"); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playAudioChime('click');
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        playAudioChime('click');
        setIsQuoteModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsQuoteModalOpen(false);
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateGoogleCalendarUrl = (leadName: string) => {
    playAudioChime('success');
    const title = encodeURIComponent(`White Pine Diagnostic Follow-Up: ${leadName}`);
    const details = encodeURIComponent(`Reviewing automation architecture and final onboarding terms.`);
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(calendarUrl, '_blank');
    triggerToast("📅 Opened Google Calendar Event Generator!", "info");
  };

  const togglePostCallVoiceMemo = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice memo recording requires Speech Recognition support.");
      return;
    }

    if (isRecordingMemo) {
      setIsRecordingMemo(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecordingMemo(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (activeWorkspaceLead) {
        setLeads((prev) => prev.map((l) => l.id === activeWorkspaceLead.id ? { ...l, memo: transcript } : l));
      }
      setIsRecordingMemo(false);
      triggerToast("🎤 Voice memo saved to lead record!", "success");
    };
    recognition.onerror = () => setIsRecordingMemo(false);
    recognition.onend = () => setIsRecordingMemo(false);

    recognition.start();
  };

  const handleExportCsv = (leadsToExport = leads) => {
    playAudioChime('copy');
    if (leadsToExport.length === 0) return triggerToast("No active leads available to export.", "error");
    
    const headers = "Entity Identity,Domain URL,Email,Phone,Priority,Stage,Score,Monthly Leakage\n";
    const rows = leadsToExport.map(l => 
      `"${l.businessName.replace(/"/g, '""')}","${l.url}","${l.email || 'N/A'}","${l.phone || 'N/A'}","${l.aiPriority || 'Stable'}","${l.stage || 'New Lead'}",${l.overallScore},$${computedRevenueLeakage}`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `white-pine-pipeline-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("📊 Pipeline CSV exported successfully!", "success");
  };

  const handleCopyCell = (text: string, cellKey: string) => {
    playAudioChime('copy');
    navigator.clipboard.writeText(text);
    setCopiedCellId(cellKey);
    triggerToast(`📋 Copied "${text}"!`, "info");
    setTimeout(() => setCopiedCellId(null), 1500);
  };

  const fetchLeads = () => {
    setIsLoadingLeads(true);
    fetch(`/api/leads?orgId=default-tenant-workspace&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        const payload = data.leads || data;
        if (Array.isArray(payload)) {
          setLeads(payload.map((l: Lead) => ({ 
            ...l, 
            stage: l.stage || 'New Lead',
            industry: l.industry as Industry || 'Home Services' 
          })));
        } else {
          setTableError("Invalid layout structure.");
        }
      })
      .catch((err) => setTableError(err.message || "Pipeline error."))
      .finally(() => setIsLoadingLeads(false));
  };

  useEffect(() => {
    setMounted(true);
    fetchLeads();

    try {
      const savedSession = localStorage.getItem('white_pine_last_active_lead');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          setActiveWorkspaceLead(parsed);
          setWsName(parsed.businessName || '');
          setWsUrl(parsed.url || '');
          setWsLoss(parsed.estimatedLoss || computedRevenueLeakage);
        }
      }
    } catch {}
  }, []);

  const handleCreateClientNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName || !newUrl) {
      return triggerToast("Missing Name & Domain URL.", "error");
    }

    setSubmittingForm(true);
    try {
      const res = await fetch('/api/leads?orgId=default-tenant-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: newBusinessName,
          url: newUrl,
          email: newEmail || 'N/A',
          phone: newPhone || 'N/A',
          overallScore: 35,
          estimatedLoss: computedRevenueLeakage,
          aiPriority: newPriority,
          industry: activeIndustry,
        })
      });

      if (!res.ok) throw new Error("Write failure.");

      playAudioChime('win');
      triggerToast(`🎉 Client Node "${newBusinessName}" deployed!`, "success");
      setNewBusinessName(''); setNewUrl(''); setNewEmail(''); setNewPhone('');
      setIsFormOpen(false);
      fetchLeads();
    } catch {
      triggerToast("Intake engine failed.", "error");
    } finally {
      setSubmittingForm(false);
    }
  };

  const openWorkspaceMatrix = (lead: Lead) => {
    playAudioChime('click');
    setActiveWorkspaceLead(lead);
    setWsName(lead.businessName);
    setWsUrl(lead.url);
    setWsLoss(computedRevenueLeakage);

    setRecentWorkspaceLeads((prev) => {
      const exists = prev.find((item) => item.id === lead.id);
      if (exists) return prev;
      return [lead, ...prev].slice(0, 4);
    });

    try {
      localStorage.setItem('white_pine_last_active_lead', JSON.stringify(lead));
    } catch {}
  };

  const closeWorkspaceMatrix = () => {
    playAudioChime('click');
    setActiveWorkspaceLead(null);
    try {
      localStorage.removeItem('white_pine_last_active_lead');
    } catch {}
  };

  const generateCleanSharableLink = (isTableLink: boolean, tableLead?: Lead) => {
    const dataObject = {
      n: isTableLink ? tableLead?.businessName : wsName,
      u: isTableLink ? tableLead?.url : wsUrl,
      l: isTableLink ? computedRevenueLeakage : wsLoss,
    };

    const targetId = isTableLink ? tableLead?.id : activeWorkspaceLead?.id;
    const base64EncryptedToken = btoa(encodeURIComponent(JSON.stringify(dataObject)));
    return `/reports/${targetId}?token=${base64EncryptedToken}`;
  };

  const liveIframePreviewUrl = activeWorkspaceLead ? generateCleanSharableLink(false) : '';

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'ALL' || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const ALL_STAGES: DealStage[] = ['New Lead', 'Pitched', 'Proposal Sent', 'Closed Won', 'Closed Lost'];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 antialiased relative pb-32 space-y-6">
      
      {/* Toast Overlay */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[160] w-[90%] max-w-sm pointer-events-none space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="bg-indigo-600 border border-indigo-400 text-white text-xs font-semibold text-center py-2.5 px-4 rounded-xl shadow-2xl animate-fadeIn">
            {toast.message}
          </div>
        ))}
      </div>

      {/* Modern Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">White Pine Console</h1>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 
                  {isOnline ? 'Online' : 'Local Mode'}
                </span>
              </div>
            </div>

            {/* Mobile Cmd+K Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="sm:hidden px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg"
            >
              🔍 Cmd+K
            </button>
          </div>

          {/* Segmented Workspace Navigation Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => { playAudioChime('click'); setActiveTab('pipeline'); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pipeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 Pipeline
            </button>
            <button
              onClick={() => { playAudioChime('click'); setActiveTab('pitch'); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pitch' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 Pitch Studio
            </button>
            <button
              onClick={() => { playAudioChime('click'); setActiveTab('vault'); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🧠 Sales Vault
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 space-y-6">

        {/* Live Signals Bar */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-amber-400 font-semibold uppercase text-[11px] shrink-0">🔔 Live Activity:</span>
            {activityFeed.map((act) => (
              <span key={act.id} className="shrink-0 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 text-[11px]">
                <strong className="text-white">{act.clientName}</strong> {act.event} ({act.timestamp})
              </span>
            ))}
          </div>
        </div>

        {/* TAB 1: PIPELINE HUB */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <AnalyticsDashboard />

            {/* Autonomous Deal Rescue Alert Card */}
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>Autonomous Deal Rescue Agent</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Scan Active</span>
              </div>

              {rescuingLeadId && generatedRescuePlay ? (
                <div className="p-3 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
                  <p className="text-slate-200">{generatedRescuePlay}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { playAudioChime('win'); navigator.clipboard.writeText(generatedRescuePlay); triggerToast("🚀 Script Copied!", "success"); }} className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg text-xs">
                      Approve & Copy
                    </button>
                    <button onClick={() => setRescuingLeadId(null)} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs">
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Click "Rescue" on any stalled proposal in your pipeline below.</p>
              )}
            </div>

            {/* Pipeline Controls Header */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search & Intake Controls */}
                <div className="flex items-center space-x-2 flex-1">
                  <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                    <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full"
                    />
                  </div>

                  <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Account</span>
                  </button>
                </div>

                {/* View Switchers & Export */}
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleExportCsv(leads)} className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>

                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setViewMode('table')} className={`px-2.5 py-1 rounded-lg text-xs transition ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                      <Table className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setViewMode('kanban')} className={`px-2.5 py-1 rounded-lg text-xs transition ${viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                      <Kanban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Intake Form */}
              {isFormOpen && (
                <form onSubmit={handleCreateClientNode} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required type="text" value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} placeholder="Business Name *" className="bg-slate-950 border border-slate-800 p-2.5 text-white rounded-xl focus:outline-none focus:border-indigo-500" />
                    <input required type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Domain URL *" className="bg-slate-950 border border-slate-800 p-2.5 text-white rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <button type="submit" disabled={submittingForm} className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl transition">
                    {submittingForm ? "Committing..." : "Deploy Client Node"}
                  </button>
                </form>
              )}
            </div>

            {/* Pipeline Content View */}
            {viewMode === 'table' ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                
                {/* Desktop Table View (md Screens and above) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50 uppercase font-semibold text-[11px]">
                        <th className="py-3 px-4">Entity Identity</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-medium text-white">
                            <div>{lead.businessName}</div>
                            <span className="text-[11px] text-slate-400 font-mono">{lead.url}</span>
                          </td>
                          <td className="py-3 px-4">
                            <select value={lead.stage || 'New Lead'} onChange={(e) => handleUpdateStage(lead.id, e.target.value as DealStage)} className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs">
                              <option value="New Lead">New Lead</option>
                              <option value="Pitched">Pitched</option>
                              <option value="Proposal Sent">Proposal Sent</option>
                              <option value="Closed Won">Closed Won 🏆</option>
                              <option value="Closed Lost">Closed Lost</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => handleTriggerDealRescueAgent(lead)} className="px-2.5 py-1 bg-indigo-950 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold">
                              Rescue
                            </button>
                            <button onClick={() => openWorkspaceMatrix(lead)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                              Open Deck
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View (Phones & Small Screens) */}
                <div className="md:hidden divide-y divide-slate-800/80 p-3 space-y-3">
                  {filteredLeads.map((lead) => (
                    <div key={lead.id} className="pt-3 first:pt-0 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-white">{lead.businessName}</h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{lead.url}</p>
                        </div>
                        <select value={lead.stage || 'New Lead'} onChange={(e) => handleUpdateStage(lead.id, e.target.value as DealStage)} className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px]">
                          <option value="New Lead">New Lead</option>
                          <option value="Pitched">Pitched</option>
                          <option value="Proposal Sent">Proposal Sent</option>
                          <option value="Closed Won">Closed Won 🏆</option>
                          <option value="Closed Lost">Closed Lost</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleTriggerDealRescueAgent(lead)} className="flex-1 py-2 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold">
                          Rescue
                        </button>
                        <button onClick={() => openWorkspaceMatrix(lead)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
                          Open Deck
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              /* Kanban Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {ALL_STAGES.map((stg) => {
                  const stageLeads = filteredLeads.filter((l) => (l.stage || 'New Lead') === stg);
                  return (
                    <div key={stg} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-semibold text-white">{stg}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">{stageLeads.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageLeads.map((lead) => (
                          <div key={lead.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                            <span className="font-semibold text-white block">{lead.businessName}</span>
                            <button onClick={() => openWorkspaceMatrix(lead)} className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                              Open Deck
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PITCH STUDIO */}
        {activeTab === 'pitch' && (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs space-y-3">
            <h3 className="text-sm font-semibold text-white">Active Pitch Studio</h3>
            <p className="text-slate-400">Select an active client lead to launch live pitch presentations.</p>
            {activeWorkspaceLead && (
              <button onClick={() => openWorkspaceMatrix(activeWorkspaceLead)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold">
                Resume Presentation for {activeWorkspaceLead.businessName}
              </button>
            )}
          </div>
        )}

        {/* TAB 3: SALES VAULT */}
        {activeTab === 'vault' && (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">AI Objection Role-Play Simulator</h3>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-amber-400 font-semibold block mb-1">Client Objection:</span>
              <p className="text-slate-300 font-serif">"{roleplayObjection}"</p>
            </div>

            <form onSubmit={handleEvaluateRoleplay} className="space-y-2">
              <textarea
                rows={3}
                placeholder="Type your response..."
                value={userRoleplayResponse}
                onChange={(e) => setUserRoleplayResponse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 text-white rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl">
                Evaluate Answer
              </button>
            </form>

            {roleplayFeedback && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1">
                <span className="font-semibold text-indigo-300">Score: {roleplayFeedback.score}/100</span>
                <p className="text-slate-300">{roleplayFeedback.tip}</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FLOATING SMART DOCK */}
      <FloatingSmartDock
        activeWorkspaceLead={activeWorkspaceLead}
        isQuoteModalOpen={isQuoteModalOpen}
        setIsQuoteModalOpen={setIsQuoteModalOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        isRecordingMemo={isRecordingMemo}
        togglePostCallVoiceMemo={togglePostCallVoiceMemo}
        generateGoogleCalendarUrl={generateGoogleCalendarUrl}
        handleSyncToCrm={handleSyncToCrm}
        handleUpdateStage={handleUpdateStage}
        playAudioChime={playAudioChime}
      />

      {/* COMMAND PALETTE MODAL */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commandQuery={commandQuery}
        setCommandQuery={setCommandQuery}
        setIsQuoteModalOpen={setIsQuoteModalOpen}
        setIsBattleCardsOpen={() => {}}
        leads={leads}
        openWorkspaceMatrix={openWorkspaceMatrix}
      />

      {/* SPLIT-SCREEN WORKSPACE DRAWER */}
      {activeWorkspaceLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={closeWorkspaceMatrix} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-6xl h-full bg-slate-950 border-l border-slate-800 flex flex-col z-10">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 text-xs">
              <span className="font-semibold text-white">{wsName}</span>
              <button onClick={closeWorkspaceMatrix} className="text-slate-400 hover:text-white">✕ Close</button>
            </div>
            <iframe src={liveIframePreviewUrl} className="w-full flex-1 border-none" title="Presentation View" />
          </div>
        </div>
      )}

      {/* QUOTER MODAL */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-950 border border-slate-800 max-w-3xl w-full rounded-2xl p-6 relative">
            <button onClick={() => setIsQuoteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <QuotingEngine 
              clientName={wsName || "Valued Client"} 
              reportUrl={window.location.origin + liveIframePreviewUrl}
              monthlyLeakage={wsLoss}
              industry={activeIndustry}
              isHighContrast={false}
              onCopySummary={() => triggerToast("Proposal summary copied!", "success")} 
              onDismiss={() => setIsQuoteModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}