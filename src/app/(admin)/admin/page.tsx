'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { 
  TrendingUp, 
  Search, 
  Zap, 
  ArrowUpRight, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Mic,
  Calendar,
  Layers,
  Plus,
  Play,
  X,
  SlidersHorizontal,
  Bot,
  Keyboard,
  Activity,
  Phone,
  Star,
  CreditCard,
  Eye,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckSquare,
  Square,
  Flame,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Key
} from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import QuotingEngine from '@/components/QuotingEngine';
import ClientTrelloBoard from '@/components/ClientTrelloBoard';
import ContentStudio from '@/components/ContentStudio';
import IntegrationSettingsDrawer from '@/components/IntegrationSettingsDrawer';

gsap.registerPlugin(useGSAP);

type DealStage = 'New Lead' | 'Pitched' | 'Proposal Sent' | 'Closed Won' | 'Closed Lost';
type Industry = 'Home Services' | 'Legal & Law' | 'Dental & Medical' | 'B2B & SaaS';
type BrandTheme = 'cyber' | 'pro_blue' | 'oled';
type WorkspaceTab = 'pipeline' | 'pitch' | 'vault';
type ActivityType = 'call' | 'webhook' | 'review' | 'payment' | 'view' | 'booking' | 'alert';
type SortField = 'businessName' | 'overallScore' | 'stage' | 'estimatedLoss';

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
  organizationId?: string;
  estimatedLoss?: number;
  isPinned?: boolean;
  isIdle?: boolean;
}

interface ActivitySignal {
  id: string;
  timestamp: string;
  clientName: string;
  event: string;
  type: ActivityType;
}

interface BattleCard {
  objection: string;
  response: string;
}

const DEFAULT_BATTLE_CARDS: Record<Industry, BattleCard[]> = {
  'Home Services': [
    { objection: "💰 Too Expensive", response: "Missing speed-to-lead text routing leaks ~$2,450/mo in lost dispatches. Recovering 1 emergency call pays for the system." },
    { objection: "🤖 Already Have SEO", response: "We fix lead drop-off. If a homeowner submits a form after hours and doesn't get an instant SMS, 60% hire a competitor." },
    { objection: "🤝 Need Partner Approval", response: "I'll send you a clean Base64 diagnostic report link and proposal summary so you can review it with your partner." }
  ],
  'Legal & Law': [
    { objection: "💰 High Retainer Overhead", response: "Losing 1 personal injury inquiry due to slow response costs $5,000+ in fees. Speed-to-lead protects case volume." },
    { objection: "🤖 Already Have Intake Staff", response: "Human intake is crucial, but 24/7 AI catches after-hours inquiries when your office is closed." }
  ],
  'Dental & Medical': [
    { objection: "💰 Budget Constraints", response: "Procedure LTV exceeds $3,500. Capturing 1 additional patient booking per month covers the system completely." }
  ],
  'B2B & SaaS': [
    { objection: "💰 Budget Constraints", response: "Speed-to-lead routing boosts demo conversions by 391% when leads are contacted in under 2 minutes." }
  ]
};

/* ================= INLINED MODAL SUB-COMPONENTS ================= */

function KpiCardSkeleton() {
  return (
    <div className="bg-slate-100 dark:bg-slate-950/80 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-2xl flex flex-col justify-between animate-pulse">
      <div className="flex items-center justify-between">
        <span className="h-3 w-14 bg-slate-800 rounded" />
        <span className="h-3.5 w-3.5 bg-slate-800 rounded-full" />
      </div>
      <div className="mt-1 space-y-1.5">
        <span className="block h-4 w-16 bg-slate-800 rounded" />
        <span className="block h-3 w-12 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcuts = [
    { key: 'Cmd / Ctrl + K', description: 'Open Command Palette' },
    { key: 'Alt + Q', description: 'Launch Solution Quoter' },
    { key: '1 / 2 / 3', description: 'Switch Tabs (Pipeline / Studio / Vault)' },
    { key: '/', description: 'Focus Search Bar' },
    { key: 'Shift + ?', description: 'Toggle Keyboard Shortcuts' },
    { key: 'ESC', description: 'Close Modals & Drawers' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-4 rounded-3xl shadow-2xl max-w-md w-full space-y-4"
          >
            <div className="flex justify-between items-center border-b border-emerald-900/10 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
                <Keyboard className="w-4 h-4 text-emerald-400" />
                <span>Keyboard Shortcuts</span>
              </div>
              <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((sc, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-emerald-900/10 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-300 font-sans">{sc.description}</span>
                  <kbd className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 border-b-2 border-b-emerald-500/70 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivitySignal[];
  leads: Lead[];
  onOpenWorkspace: (lead: Lead) => void;
}

function ActivityDrawer({ isOpen, onClose, activities, leads, onOpenWorkspace }: ActivityDrawerProps) {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredActivities = activities.filter((act) => 
    filterType === 'ALL' || act.type === filterType
  );

  const handleCardClick = (act: ActivitySignal) => {
    const matchedLead = leads.find(l => l.businessName.toLowerCase().includes(act.clientName.toLowerCase()));
    if (matchedLead) {
      onOpenWorkspace(matchedLead);
      onClose();
      toast.success(`🚀 Jumped to workspace for "${matchedLead.businessName}"`);
    } else {
      toast.info(`Event logged for ${act.clientName}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-100 dark:bg-slate-950 border-l border-emerald-900/10 dark:border-slate-800/80 z-[150] p-4 shadow-2xl font-mono text-xs flex flex-col space-y-4 pt-[calc(max(16px,env(safe-area-inset-top))+16px)] pb-[calc(max(16px,env(safe-area-inset-bottom))+16px)]"
          >
            <div className="flex justify-between items-center border-b border-emerald-900/10 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase">Real-Time Event Stream</h3>
              </div>
              <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['ALL', 'payment', 'view', 'call', 'booking', 'alert'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-sm font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    filterType === t 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-emerald-900/10 dark:border-slate-800/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => handleCardClick(act)}
                  className="bg-white/90 dark:bg-[#121824]/80 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-3.5 rounded-2xl space-y-1.5 hover:border-emerald-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">[{act.timestamp}]</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase border ${
                      act.type === 'payment'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : act.type === 'view'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : act.type === 'alert'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    }`}>
                      {act.type === 'call' && <Phone className="w-3 h-3 text-emerald-400" />}
                      {act.type === 'webhook' && <Zap className="w-3 h-3 text-amber-400" />}
                      {act.type === 'review' && <Star className="w-3 h-3 text-purple-400" />}
                      {act.type === 'payment' && <CreditCard className="w-3 h-3 text-emerald-400" />}
                      {act.type === 'view' && <Eye className="w-3 h-3 text-sky-400" />}
                      {act.type === 'booking' && <Calendar className="w-3 h-3 text-emerald-400" />}
                      {act.type === 'alert' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                      {act.type}
                    </span>
                  </div>
                  <div className="font-sans text-xs text-slate-800 dark:text-white font-bold flex items-center justify-between">
                    <span>{act.clientName}</span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-emerald-300 text-sm font-sans">{act.event}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface FloatingSmartDockProps {
  activeWorkspaceLead: any;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRecordingMemo: boolean;
  togglePostCallVoiceMemo: () => void;
  generateGoogleCalendarUrl: (name: string) => void;
  handleSyncToCrm: (lead: any) => void;
  handleUpdateStage: (id: string, stage: any) => void;
  playAudioChime: (type: any) => void;
}

function FloatingSmartDock({
  activeWorkspaceLead,
  setIsQuoteModalOpen,
  setIsCommandPaletteOpen,
  isRecordingMemo,
  togglePostCallVoiceMemo,
  generateGoogleCalendarUrl,
  handleSyncToCrm,
  handleUpdateStage,
  playAudioChime,
}: FloatingSmartDockProps) {
  return (
    <div className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[130] no-print px-2 w-full max-w-lg flex justify-center">
      <div className="bg-white/95 dark:bg-[#121824]/95 border border-emerald-900/10 dark:border-slate-800/80 backdrop-blur-xl px-3 py-2 rounded-full shadow-2xl flex items-center justify-between gap-1.5 font-mono text-xs w-full max-w-md overflow-x-auto no-scrollbar">
        {activeWorkspaceLead ? (
          <>
            <button
              onClick={togglePostCallVoiceMemo}
              className={`px-2.5 py-1.5 rounded-full font-bold text-xs uppercase transition-all cursor-pointer border shrink-0 flex items-center gap-1 ${
                isRecordingMemo
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-emerald-900/10 dark:border-slate-800/80 hover:bg-slate-800'
              }`}
            >
              <Mic className="w-3 h-3" /> {isRecordingMemo ? 'Rec...' : 'Memo'}
            </button>

            <button
              onClick={() => generateGoogleCalendarUrl(activeWorkspaceLead.businessName)}
              className="px-2.5 py-1.5 bg-emerald-600/30 text-emerald-700 dark:text-emerald-200 border border-emerald-500/40 rounded-full font-bold text-xs uppercase hover:bg-emerald-600 shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" /> Schedule
            </button>

            <button
              onClick={() => handleSyncToCrm(activeWorkspaceLead)}
              className="px-2.5 py-1.5 bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 rounded-full font-bold text-xs uppercase hover:bg-emerald-600 shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-emerald-400" /> CRM
            </button>

            <button
              onClick={() => {
                playAudioChime('click');
                setIsQuoteModalOpen((p) => !p);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black rounded-full text-xs uppercase shadow-lg shrink-0 cursor-pointer"
            >
              🧮 Quoter
            </button>

            <button
              onClick={() => handleUpdateStage(activeWorkspaceLead.id, 'Closed Won')}
              className="px-3 py-1.5 bg-emerald-400 text-black font-black rounded-full text-xs uppercase shrink-0 cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Won
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                playAudioChime('click');
                setIsQuoteModalOpen((p) => !p);
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-black text-xs uppercase font-mono rounded-full shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border border-slate-700 min-h-[40px]"
            >
              <span className="text-base">🧮</span> Solution Quoter Engine
            </button>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-800 border border-emerald-900/10 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 rounded-full font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0 min-h-[40px]"
            >
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-mono font-bold">Search</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commandQuery: string;
  setCommandQuery: (val: string) => void;
  setIsQuoteModalOpen: (val: boolean) => void;
  leads: any[];
  openWorkspaceMatrix: (lead: any) => void;
}

function CommandPaletteModal({
  isOpen,
  onClose,
  commandQuery,
  setCommandQuery,
  setIsQuoteModalOpen,
  leads,
  openWorkspaceMatrix,
}: CommandPaletteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[calc(max(20px,env(safe-area-inset-top))+40px)] p-4 font-mono text-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-emerald-900/10 dark:border-slate-800/80 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search leads or actions (e.g., 'Quoter', 'Acme')..."
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            className="w-full bg-transparent text-slate-800 dark:text-white outline-none text-xs font-mono"
          />
          <span className="text-sm bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold">ESC</span>
        </div>

        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          <div
            onClick={() => {
              onClose();
              setIsQuoteModalOpen(true);
            }}
            className="p-2.5 hover:bg-emerald-600/20 rounded-xl cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-200"
          >
            <span>🧮 Launch Interactive Quoter</span>
            <span className="text-sm text-emerald-400 font-bold">Alt+Q</span>
          </div>
          {leads
            .filter((l) => l.businessName.toLowerCase().includes(commandQuery.toLowerCase()))
            .slice(0, 3)
            .map((lead) => (
              <div
                key={lead.id}
                onClick={() => {
                  onClose();
                  openWorkspaceMatrix(lead);
                }}
                className="p-2.5 hover:bg-emerald-600/20 rounded-xl cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-200"
              >
                <span>🚀 Open Workspace: {lead.businessName}</span>
                <span className="text-sm text-emerald-400 font-bold">{lead.aiPriority || 'Lead'}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE COMPONENT ================= */

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [sortField, setSortField] = useState<SortField>('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [activePresetFilter, setActivePresetFilter] = useState<'ALL' | 'HIGH_LOSS' | 'STALLED' | 'CLOSED_WON'>('ALL');

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isIntegrationDrawerOpen, setIsIntegrationDrawerOpen] = useState(false);

  const [activeThemeMode, setActiveThemeMode] = useState<BrandTheme>('cyber');
  const [activePopoverLeadId, setActivePopoverLeadId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isVoicePitchActive, setIsVoicePitchActive] = useState(false);

  const [activityFeed] = useState<ActivitySignal[]>([
    { id: '1', timestamp: '11:42 AM', clientName: 'Apex Plumbing', event: '💳 Stripe payment of $1,500 cleared', type: 'payment' },
    { id: '2', timestamp: '11:40 AM', clientName: 'Summit Roofing', event: '👁️ Prospect opened diagnostic audit link', type: 'view' },
    { id: '3', timestamp: '11:38 AM', clientName: "Dave's HVAC", event: '🤖 AI Agent intercepted call (Est. $1,800)', type: 'call' },
    { id: '4', timestamp: '11:24 AM', clientName: 'Midwest Dental', event: '📅 Scheduled onboarding call for Friday 2 PM', type: 'booking' },
    { id: '5', timestamp: '11:10 AM', clientName: 'Precision Legal', event: '🚨 SLA Warning: Response time > 5m', type: 'alert' },
    { id: '6', timestamp: '11:05 AM', clientName: 'Metro Law', event: '⭐ 5-Star Google Review auto-replied', type: 'review' }
  ]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('pipeline');
  const [isConfigDeckCollapsed, setIsConfigDeckCollapsed] = useState(true);
  const [showOpsDrawer, setShowOpsDrawer] = useState(false);

  const [rescuingLeadId, setRescuingLeadId] = useState<string | null>(null);
  const [generatedRescuePlay, setGeneratedRescuePlay] = useState<string | null>(null);
  const [roleplayObjection] = useState<string>("Your monthly retainer seems pretty high for a small plumbing shop.");
  const [userRoleplayResponse, setUserRoleplayResponse] = useState<string>("");
  const [roleplayFeedback, setRoleplayFeedback] = useState<{ score: number; tip: string } | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'trello'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [activeIndustry, setActiveIndustry] = useState<Industry>('Home Services');

  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [recentWorkspaceLeads, setRecentWorkspaceLeads] = useState<Lead[]>([]);
  const [customBattleCards] = useState<Record<Industry, BattleCard[]>>(DEFAULT_BATTLE_CARDS);

  const [averageLtv] = useState<number>(1500);
  const [monthlyTraffic] = useState<number>(5000);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  const [activeWorkspaceLead, setActiveWorkspaceLead] = useState<Lead | null>(null);
  const [wsName, setWsName] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [wsLoss, setWsLoss] = useState(112500);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const computedRevenueLeakage = Math.floor(monthlyTraffic * 0.30 * (averageLtv * 0.05));
  const totalClientValueGuarded = 84200;

  const playAudioChime = (type: 'copy' | 'win' | 'click' | 'success' | 'reset') => {
    if (isMuted) return;
    if (typeof window === 'undefined') return;

    if ('vibrate' in navigator) {
      if (type === 'click') navigator.vibrate(10);
      else if (type === 'copy' || type === 'success') navigator.vibrate([15, 30, 15]);
      else if (type === 'win') navigator.vibrate([30, 50, 30, 50, 100]);
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  const handleUpdateStage = (leadId: string, newStage: DealStage) => {
    if (newStage === 'Closed Won') playAudioChime('win');
    else playAudioChime('click');

    const previousLeads = [...leads];
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));

    toast.success(`Stage updated to "${newStage}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setLeads(previousLeads);
          toast.info('Reverted stage update');
        },
      },
    });
  };

  const togglePinLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playAudioChime('click');
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, isPinned: !l.isPinned } : l));
    toast.info("Updated pinned decks");
  };

  const toggleSelectLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playAudioChime('click');
    setSelectedLeadIds((prev) => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkMarkWon = () => {
    playAudioChime('win');
    setLeads((prev) => prev.map((l) => selectedLeadIds.includes(l.id) ? { ...l, stage: 'Closed Won' } : l));
    toast.success(`🏆 Marked ${selectedLeadIds.length} deals as Closed Won!`);
    setSelectedLeadIds([]);
  };

  const handleSortColumn = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleVoicePitchCommandEngine = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition requires Chrome or Safari support.");
      return;
    }

    if (isVoicePitchActive) {
      setIsVoicePitchActive(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsVoicePitchActive(true);
      toast.info("🎙️ Hands-Free Voice Controls Listening...");
    };

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const speechText = event.results[lastIndex][0].transcript.toLowerCase().trim();

      if (speechText.includes("open quoter")) {
        playAudioChime('win');
        setIsQuoteModalOpen(true);
        toast.success("🎙️ Command: Opened Quoting Engine");
      } else if (speechText.includes("close quoter")) {
        playAudioChime('click');
        setIsQuoteModalOpen(false);
        toast.info("🎙️ Command: Closed Quoter");
      } else if (speechText.includes("mark won") || speechText.includes("closed won")) {
        if (activeWorkspaceLead) {
          handleUpdateStage(activeWorkspaceLead.id, 'Closed Won');
          toast.success("🎙️ Command: Marked Lead as Closed Won!");
        }
      }
    };

    recognition.onerror = () => setIsVoicePitchActive(false);
    recognition.onend = () => setIsVoicePitchActive(false);

    recognition.start();
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    playAudioChime('click');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnStage = (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      handleUpdateStage(leadId, newStage);
    }
  };

  const handleTriggerDealRescueAgent = (lead: Lead) => {
    playAudioChime('win');
    setRescuingLeadId(lead.id);
    const rescueText = `Hey ${lead.businessName}! I noticed you revisited the diagnostic audit link today. Based on your $${(lead.estimatedLoss || computedRevenueLeakage).toLocaleString()}/mo leakage calculation, we can waive your initial onboarding fee if we finalize setup before Friday. Let me know if you want to review!`;
    setGeneratedRescuePlay(rescueText);
    toast.success(`🤖 Rescue play generated for "${lead.businessName}"`);
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
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `⚡ Syncing "${lead.businessName}" to CRM...`,
        success: `✅ Synced "${lead.businessName}" to CRM!`,
        error: `❌ Failed to sync "${lead.businessName}".`,
      }
    );
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("🟢 System Back Online"); };
    const handleOffline = () => { setIsOnline(false); toast.error("🔴 Connection Lost. Local Cache Active."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInputActive = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      // Cmd/Ctrl+K now belongs to the global AdminCommandPalette (admin/layout.tsx),
      // which covers every /admin/* route. This page's own lead-search palette is
      // still reachable via the "Search Leads" button below.

      if (e.key === '?') {
        e.preventDefault();
        playAudioChime('click');
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (!isInputActive) {
        if (e.key === '1') { setActiveTab('pipeline'); playAudioChime('click'); }
        if (e.key === '2') { setActiveTab('pitch'); playAudioChime('click'); }
        if (e.key === '3') { setActiveTab('vault'); playAudioChime('click'); }
        if (e.key === '/') {
          e.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
      }

      if (isInputActive) return;

      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        playAudioChime('click');
        setIsQuoteModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsQuoteModalOpen(false);
        setIsCommandPaletteOpen(false);
        setIsShortcutsOpen(false);
        setIsActivityDrawerOpen(false);
        setIsIntegrationDrawerOpen(false);
        setActivePopoverLeadId(null);
        setShowQrModal(false);
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
    toast.info("📅 Opened Google Calendar Event Generator!");
  };

  const togglePostCallVoiceMemo = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice memo recording requires Speech Recognition support.");
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
      toast.success("🎤 Voice memo saved!");
    };
    recognition.onerror = () => setIsRecordingMemo(false);
    recognition.onend = () => setIsRecordingMemo(false);

    recognition.start();
  };

  const handleLaunchDemoPortal = (orgId: string = 'demo-apex-plumbing') => {
    playAudioChime('win');
    toast.info(`🎭 Launching Client Portal Demo (${orgId})...`);
    window.open(`/portal?demo=true&orgId=${orgId}`, '_blank');
  };

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName.trim() || !newUrl.trim()) {
      toast.error("Please enter a Business Name and Domain URL.");
      return;
    }

    setSubmittingForm(true);
    playAudioChime('win');

    const newLeadItem: Lead = {
      id: `lead-${Date.now()}`,
      businessName: newBusinessName,
      url: newUrl,
      email: newEmail || 'contact@client.com',
      phone: newPhone || '(555) 000-0000',
      overallScore: 88,
      stage: 'New Lead',
      industry: activeIndustry,
      estimatedLoss: computedRevenueLeakage,
      organizationId: `demo-${newBusinessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    };

    setTimeout(() => {
      setLeads((prev) => {
        const next = [newLeadItem, ...prev];
        try { localStorage.setItem('white_pine_cached_leads', JSON.stringify(next)); } catch {}
        return next;
      });
      setSubmittingForm(false);
      setIsFormOpen(false);
      setNewBusinessName('');
      setNewUrl('');
      setNewEmail('');
      setNewPhone('');
      toast.success(`✅ Created account node for "${newLeadItem.businessName}"!`);
    }, 600);
  };

  const fetchLeads = () => {
    try {
      const cached = localStorage.getItem('white_pine_cached_leads');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLeads(parsed);
          setIsLoadingLeads(false);
        }
      }
    } catch {}

    fetch(`/api/leads?orgId=default-tenant-workspace&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        const payload = data.leads || data;
        if (Array.isArray(payload)) {
          const freshLeads = payload.map((l: Lead, idx: number) => ({ 
            ...l, 
            stage: l.stage || 'New Lead',
            industry: l.industry as Industry || 'Home Services',
            overallScore: l.overallScore || Math.floor(Math.random() * 30) + 65,
            isIdle: idx % 3 === 0
          }));
          setLeads(freshLeads);
          try { localStorage.setItem('white_pine_cached_leads', JSON.stringify(freshLeads)); } catch {}
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

  const openWorkspaceMatrix = (lead: Lead) => {
    playAudioChime('click');
    setActiveWorkspaceLead(lead);
    setWsName(lead.businessName);
    setWsUrl(lead.url);
    setWsLoss(lead.estimatedLoss || computedRevenueLeakage);
    if (lead.industry) setActiveIndustry(lead.industry);

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
      l: isTableLink ? (tableLead?.estimatedLoss || computedRevenueLeakage) : wsLoss,
    };

    const targetId = isTableLink ? tableLead?.id : activeWorkspaceLead?.id;
    const base64EncryptedToken = btoa(encodeURIComponent(JSON.stringify(dataObject)));
    return `/reports/${targetId}?token=${base64EncryptedToken}`;
  };

  const liveIframePreviewUrl = activeWorkspaceLead ? generateCleanSharableLink(false) : '';

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch = lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lead.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'ALL' || lead.stage === stageFilter;

      if (activePresetFilter === 'HIGH_LOSS') {
        return matchesSearch && matchesStage && (lead.estimatedLoss || computedRevenueLeakage) >= 50000;
      }
      if (activePresetFilter === 'STALLED') {
        return matchesSearch && matchesStage && lead.stage === 'Pitched';
      }
      if (activePresetFilter === 'CLOSED_WON') {
        return matchesSearch && matchesStage && lead.stage === 'Closed Won';
      }

      return matchesSearch && matchesStage;
    })
    .sort((a, b) => {
      let valA: any = a[sortField] || 0;
      let valB: any = b[sortField] || 0;

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const ALL_STAGES: DealStage[] = ['New Lead', 'Pitched', 'Proposal Sent', 'Closed Won', 'Closed Lost'];
  const pinnedLeads = leads.filter(l => l.isPinned);

  // Stagger-fade entrance for KPI tiles / table rows / kanban cards on mount,
  // data-load, and view switches. transform (y) + opacity only, so it stays
  // on the compositor and holds 60fps. Re-runs whenever the visible card set changes.
  useGSAP(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      '.gsap-card',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: reduceMotion ? 0 : 0.25, ease: 'power1.out', stagger: reduceMotion ? 0 : 0.04, overwrite: true }
    );
  }, { scope: pageRef, dependencies: [mounted, isLoadingLeads, activeTab, viewMode, filteredLeads.length] });

  if (!mounted) return null;

  return (
    <div ref={pageRef} className={`admin-console min-h-[100dvh] antialiased relative pb-36 select-none transition-colors pt-[calc(max(12px,env(safe-area-inset-top))+8px)] bg-[#F1F5F2] text-slate-800 ${
      activeThemeMode === 'oled'
        ? 'dark:bg-black dark:text-white'
        : activeThemeMode === 'pro_blue'
        ? 'dark:bg-[#0B132B] dark:text-gray-100'
        : 'dark:bg-[#0B0F15] dark:text-gray-200'
    }`}>

      {/* Background Ambient Glows */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ================= 🚀 COMPACT MISSION CONTROL HEADER ================= */}
      <header className="max-w-7xl mx-auto px-3 sm:px-4 pt-2 sm:pt-4 no-print relative z-10 font-mono text-xs">
        <div className="bg-white/90 dark:bg-[#121824]/80 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 backdrop-blur-2xl shadow-2xl space-y-3 sm:space-y-4">
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1 w-full lg:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    OPERATOR CONSOLE • {leads.length || 12} CLIENTS
                  </span>
                </div>

                <span className={`text-sm px-2 py-0.5 rounded-lg border font-bold sm:hidden ${
                  isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {isOnline ? '🟢 Online' : '🔴 Local'}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white font-sans tracking-tight">
                White Pine Console
              </h1>
            </div>

            {/* 📊 HIGH-DENSITY KPI METRIC GRID WITH COUNTUP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              {isLoadingLeads ? (
                <>
                  <KpiCardSkeleton />
                  <KpiCardSkeleton />
                  <KpiCardSkeleton />
                  <KpiCardSkeleton />
                </>
              ) : (
                <>
                  <div className="gsap-card bg-slate-100 dark:bg-slate-950/80 border border-emerald-900/10 dark:border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span>Pipeline</span>
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-slate-800 dark:text-white font-mono">
                        $<CountUp end={totalClientValueGuarded} duration={2} separator="," />
                      </div>
                      <div className="flex items-center text-sm text-emerald-400 font-medium mt-0.5">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                      </div>
                    </div>
                  </div>

                  <div className="gsap-card bg-slate-100 dark:bg-slate-950/80 border border-emerald-900/10 dark:border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span>Active Leads</span>
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-slate-800 dark:text-white font-mono">{leads.length || 14}</div>
                      <div className="flex items-center text-sm text-emerald-400 font-medium mt-0.5">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> +3 today
                      </div>
                    </div>
                  </div>

                  <div className="gsap-card bg-slate-100 dark:bg-slate-950/80 border border-emerald-900/10 dark:border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span>Automations</span>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-slate-800 dark:text-white font-mono">99.4%</div>
                      <div className="text-sm text-emerald-400 font-medium mt-0.5">0 errors</div>
                    </div>
                  </div>

                  <div className="gsap-card bg-slate-100 dark:bg-slate-950/80 border border-emerald-900/10 dark:border-slate-800/80 hover:border-slate-700 transition-colors p-3 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span>Avg Speed</span>
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-slate-800 dark:text-white font-mono">1.8m</div>
                      <div className="text-sm text-emerald-400 font-medium mt-0.5">Instant SMS</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Global Controls */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={() => setIsActivityDrawerOpen(true)}
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-800 border border-emerald-900/10 dark:border-slate-800/80 text-emerald-400 font-semibold rounded-xl cursor-pointer transition-all text-xs flex items-center gap-1.5 shrink-0"
              >
                <Activity className="w-3.5 h-3.5" /> Activity <span className="text-slate-500">({activityFeed.length})</span>
              </button>

              <button
                onClick={() => setIsIntegrationDrawerOpen(true)}
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-800 border border-emerald-900/10 dark:border-slate-800/80 text-amber-300 font-semibold rounded-xl cursor-pointer transition-all text-xs flex items-center gap-1.5 shrink-0"
              >
                <Key className="w-3.5 h-3.5" /> API Vault
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              </button>

              <button
                onClick={() => setShowOpsDrawer(!showOpsDrawer)}
                className={`px-3 py-2.5 border rounded-xl cursor-pointer transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                  showOpsDrawer ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-950 border-emerald-900/10 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-800'
                }`}
              >
                Ops {showOpsDrawer ? '▲' : '▼'}
              </button>

              <div className="w-px h-6 bg-slate-800 mx-0.5 hidden sm:block" />

              <button
                onClick={() => { setIsMuted(!isMuted); toast.info(isMuted ? "🔊 Audio Unmuted" : "🔇 Audio Muted"); }}
                className="p-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-800 border border-emerald-900/10 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer transition-all shrink-0"
                title="Toggle Sound Effects"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => handleLaunchDemoPortal('demo-apex-plumbing')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                Demo Portal
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE OPERATIONS DRAWER */}
          {showOpsDrawer && (
            <div className="space-y-3 pt-3 border-t border-emerald-900/10 dark:border-slate-800/80 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Twilio Voice & SMS Trunk:</span>
                  <span className="text-emerald-400 font-bold">🟢 Healthy ($24.10)</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">AI Dispatch Latency:</span>
                  <span className="text-emerald-400 font-bold">⚡ 82ms</span>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold uppercase">🏢 Multi-Tenant Impersonation:</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Switch workspace view to test portal context.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLaunchDemoPortal('demo-apex-plumbing')} className="px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 text-emerald-700 dark:text-emerald-300 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer">Apex Plumbing ➔</button>
                  <button onClick={() => handleLaunchDemoPortal('demo-summit-roofing')} className="px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 text-emerald-700 dark:text-emerald-300 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer">Summit Roofing ➔</button>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-2xl flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>TERMINAL STREAM:</span>
                  </span>
                  {activityFeed.map((act) => (
                    <span key={act.id} className="shrink-0 bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 px-2.5 py-1 rounded-xl text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-500">[{act.timestamp}]</span>
                      <strong className="text-slate-800 dark:text-white font-bold">{act.clientName}:</strong>
                      <span className="text-emerald-300">{act.event}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Navigation Controls */}
          <div className="flex flex-wrap justify-between items-center pt-3 border-t border-emerald-900/10 dark:border-slate-800/80 gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-1 rounded-2xl shadow-xl w-full sm:w-auto justify-between sm:justify-start text-xs">
              <button
                onClick={() => { playAudioChime('click'); setActiveTab('pipeline'); }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pipeline' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Pipeline <kbd className="hidden lg:inline text-[10px] normal-case bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 border-b-2 border-b-black/25 dark:border-b-white/25 rounded px-1.5 py-0.5 shadow-sm">1</kbd>
              </button>
              <button
                onClick={() => { playAudioChime('click'); setActiveTab('pitch'); }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pitch' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" /> Studio <kbd className="hidden lg:inline text-[10px] normal-case bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 border-b-2 border-b-black/25 dark:border-b-white/25 rounded px-1.5 py-0.5 shadow-sm">2</kbd>
              </button>
              <button
                onClick={() => { playAudioChime('click'); setActiveTab('vault'); }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'vault' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" /> Vault <kbd className="hidden lg:inline text-[10px] normal-case bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 border-b-2 border-b-black/25 dark:border-b-white/25 rounded px-1.5 py-0.5 shadow-sm">3</kbd>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={toggleVoicePitchCommandEngine}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isVoicePitchActive
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-emerald-900/10 dark:border-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <Mic className="w-3 h-3" /> {isVoicePitchActive ? 'Listening…' : 'Voice'}
              </button>

              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
                title="Keyboard Shortcuts (Shift + ?)"
              >
                <Keyboard className="w-3 h-3 text-emerald-400" /> <span className="hidden sm:inline">Shortcuts</span>
              </button>

              <div className="flex bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-1 rounded-xl">
                {(['cyber', 'pro_blue', 'oled'] as BrandTheme[]).map((thm) => (
                  <button
                    key={thm}
                    onClick={() => { playAudioChime('click'); setActiveThemeMode(thm); }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      activeThemeMode === thm ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {thm === 'cyber' ? '⚡ Cyber' : thm === 'pro_blue' ? '🔷 Blue' : '🖤 OLED'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-xl font-semibold hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Search className="w-3 h-3" /> <span className="text-slate-500">Search Leads</span>
                <kbd className="text-[10px] bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 border-b-2 border-b-slate-400 dark:border-b-slate-600 px-1.5 py-0.5 rounded font-bold shadow-sm">⌘K</kbd>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 📌 PINNED + RECENT DECKS STRIP */}
      {(pinnedLeads.length > 0 || recentWorkspaceLeads.length > 0) && !activeWorkspaceLead && (
        <div className="max-w-7xl mx-auto px-4 mt-3 z-10 relative">
          <div className="bg-white/90 dark:bg-[#121824]/60 border border-emerald-900/10 dark:border-slate-800/80 rounded-2xl px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-xs">
            {pinnedLeads.length > 0 && (
              <>
                <span className="text-amber-400 font-semibold shrink-0 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" /> Pinned:
                </span>
                {pinnedLeads.map((pLead) => (
                  <button
                    key={pLead.id}
                    onClick={() => openWorkspaceMatrix(pLead)}
                    className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl shrink-0 font-semibold transition-all cursor-pointer flex items-center gap-1 hover:bg-amber-500/20"
                  >
                    <span>{pLead.businessName}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                ))}
              </>
            )}

            {pinnedLeads.length > 0 && recentWorkspaceLeads.length > 0 && (
              <div className="w-px h-5 bg-slate-800 shrink-0" />
            )}

            {recentWorkspaceLeads.length > 0 && (
              <>
                <span className="text-slate-500 font-semibold shrink-0">Recent:</span>
                {recentWorkspaceLeads.map((rLead) => (
                  <button
                    key={rLead.id}
                    onClick={() => openWorkspaceMatrix(rLead)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shrink-0 font-semibold transition-all cursor-pointer"
                  >
                    {rLead.businessName}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ➕ NEW CLIENT ONBOARDING FORM MODAL */}
      {isFormOpen && (
        <div className="max-w-7xl mx-auto px-4 mt-4 relative z-20 animate-fadeIn font-mono text-xs">
          <div className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-3 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-900/10 dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Onboard New Client Account Node
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold cursor-pointer">✕ Close</button>
            </div>

            <form onSubmit={handleCreateNewClient} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold text-xs">Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Plumbing"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2.5 text-slate-800 dark:text-white rounded-xl outline-none focus:border-emerald-500 text-xs font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold text-xs">Website Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apexplumbing.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2.5 text-slate-800 dark:text-white rounded-xl outline-none focus:border-emerald-500 text-xs font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold text-xs">Contact Email</label>
                <input
                  type="email"
                  placeholder="owner@apex.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2.5 text-slate-800 dark:text-white rounded-xl outline-none focus:border-emerald-500 text-xs font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 font-bold text-xs">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2.5 text-slate-800 dark:text-white rounded-xl outline-none focus:border-emerald-500 text-xs font-sans"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2 border-t border-emerald-900/10 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  {submittingForm ? 'Creating...' : 'Create Account Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌀 TAB TRANSITIONS VIA FRAMER MOTION */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* TAB 1: PIPELINE HUB */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4 mt-4">
              <div className="relative z-10"><AnalyticsDashboard /></div>

              {/* Autonomous Rescue Banner */}
              <div className="px-4 max-w-7xl mx-auto relative z-10 no-print">
                <div className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold uppercase text-xs flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" /> Autonomous Deal Rescue Agent
                    </span>
                    <span className="text-emerald-400 text-xs">Scan Active</span>
                  </div>
                  
                  {rescuingLeadId && generatedRescuePlay ? (
                    <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-500/30 p-3 rounded-xl space-y-2 animate-fadeIn">
                      <p className="text-slate-700 dark:text-slate-200 text-xs font-sans">{generatedRescuePlay}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { playAudioChime('win'); navigator.clipboard.writeText(generatedRescuePlay); toast.success("🚀 Rescue Script Copied!"); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase text-sm shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer">Approve & Copy</button>
                        <button onClick={() => setRescuingLeadId(null)} className="px-3 py-1.5 bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg font-bold uppercase text-sm cursor-pointer">Dismiss</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Click "🤖 Rescue" on any stalled proposal in your pipeline below.</p>
                  )}
                </div>
              </div>

              <div className="px-4 max-w-7xl mx-auto relative z-10">
                
                {/* 🧭 UNIFIED PIPELINE TOOLBAR */}
                <div className="mb-4 no-print bg-white/90 dark:bg-[#121824]/60 border border-emerald-900/10 dark:border-slate-800/80 rounded-2xl p-3 space-y-3 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2 items-center w-full sm:w-auto flex-wrap">
                      <button onClick={() => setIsFormOpen(!isFormOpen)} className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                        {isFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isFormOpen ? "Close" : "New Account"}
                      </button>

                      <div className="flex bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-1 rounded-xl">
                        <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>Table</button>
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${viewMode === 'kanban' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>Kanban</button>
                        <button onClick={() => setViewMode('trello')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${viewMode === 'trello' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>Trello</button>
                      </div>
                    </div>

                    {/* 🔍 SEARCH CONTROLS */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search accounts... (/)"
                          className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-slate-800 dark:text-white placeholder-slate-500 text-xs w-full outline-none focus:border-emerald-500"
                        />
                      </div>

                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 rounded-xl px-3 py-2 text-slate-800 dark:text-white text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="ALL">All Stages</option>
                        <option value="New Lead">New Lead</option>
                        <option value="Pitched">Pitched</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                      </select>
                    </div>
                  </div>

                  {/* 🎯 SMART ONE-CLICK FILTER PRESET CHIPS */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-emerald-900/10 dark:border-slate-800/80">
                    <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                      <Filter className="w-3 h-3" /> Presets:
                    </span>
                    <button
                      onClick={() => setActivePresetFilter('ALL')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        activePresetFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-emerald-900/10 dark:border-slate-800/80 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      All Decks
                    </button>
                    <button
                      onClick={() => setActivePresetFilter('HIGH_LOSS')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                        activePresetFilter === 'HIGH_LOSS' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-rose-400 border border-rose-500/30 hover:bg-rose-950/40'
                      }`}
                    >
                      <Flame className="w-3 h-3 text-rose-400" /> High Loss (&gt;$50k)
                    </button>
                    <button
                      onClick={() => setActivePresetFilter('STALLED')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        activePresetFilter === 'STALLED' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-amber-400 border border-amber-500/30 hover:bg-amber-950/40'
                      }`}
                    >
                      ⏳ Stalled Deals
                    </button>
                    <button
                      onClick={() => setActivePresetFilter('CLOSED_WON')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        activePresetFilter === 'CLOSED_WON' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-950/40'
                      }`}
                    >
                      🏆 Closed Won
                    </button>
                  </div>
                </div>

                {viewMode === 'table' ? (
                  <div className="border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 rounded-2xl shadow-2xl overflow-hidden bg-white/90 dark:bg-[#121824]/60 backdrop-blur-xl font-mono text-xs">
                    <div className="p-4 border-b border-emerald-900/10 dark:border-slate-800/80 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button onClick={handleSelectAllLeads} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                          {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase">Pipeline Nodes</h2>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredLeads.length} Accounts Found</span>
                    </div>
                    
                    {/* Desktop View Table */}
                    <div className="hidden md:block p-4 overflow-x-auto">
                      {isLoadingLeads ? (
                        <div className="space-y-2 p-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-12 w-full bg-slate-800/40 animate-pulse rounded-xl" />
                          ))}
                        </div>
                      ) : tableError ? (
                        <div className="text-rose-400 text-xs p-4">⚠️ Sync Error: {tableError}</div>
                      ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                          <Search className="w-6 h-6 text-slate-600 dark:text-slate-500" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No accounts match your filters</p>
                          <p className="text-xs text-slate-500">Try clearing the search, stage filter, or preset.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[650px]">
                          <thead className="text-xs uppercase font-bold bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-emerald-900/10 dark:border-slate-800/80">
                            <tr>
                              <th className="p-3 w-8">Select</th>
                              <th onClick={() => handleSortColumn('businessName')} className="p-3 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors select-none">
                                <div className="flex items-center gap-1">
                                  <span>Entity Identity</span>
                                  {sortField === 'businessName' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                </div>
                              </th>
                              <th onClick={() => handleSortColumn('overallScore')} className="p-3 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors select-none">
                                <div className="flex items-center gap-1">
                                  <span>Health Score</span>
                                  {sortField === 'overallScore' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                </div>
                              </th>
                              <th onClick={() => handleSortColumn('stage')} className="p-3 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors select-none">
                                <div className="flex items-center gap-1">
                                  <span>Stage</span>
                                  {sortField === 'stage' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                </div>
                              </th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {filteredLeads.map((lead) => lead.id && (
                              <tr key={lead.id} className="gsap-card group hover:bg-slate-800/80 transition-all relative">
                                <td className="p-3">
                                  <button onClick={(e) => toggleSelectLead(lead.id, e)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer">
                                    {selectedLeadIds.includes(lead.id) ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>

                                <td
                                  onClick={() => setActivePopoverLeadId(activePopoverLeadId === lead.id ? null : lead.id)}
                                  className="p-3 font-sans font-semibold text-slate-800 dark:text-white cursor-pointer relative"
                                >
                                  <div className="flex items-center gap-2">
                                    <button onClick={(e) => togglePinLead(lead.id, e)} className="text-slate-500 hover:text-amber-400 cursor-pointer shrink-0">
                                      <Star className={`w-3.5 h-3.5 ${lead.isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                    </button>
                                    <span>{lead.businessName}</span>

                                    {lead.isIdle && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-semibold shrink-0">
                                        ⌛ 48h Idle
                                      </span>
                                    )}

                                    <SlidersHorizontal className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block font-normal">{lead.url}</span>

                                  {/* Quick-Peek Popover */}
                                  {activePopoverLeadId === lead.id && (
                                    <div className="absolute left-4 top-12 z-50 bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-3 rounded-2xl shadow-2xl space-y-2 text-xs font-mono animate-fadeIn w-64" onClick={(e) => e.stopPropagation()}>
                                      <div className="border-b border-emerald-900/10 dark:border-slate-800/80 pb-1 flex justify-between items-center">
                                        <span className="font-bold text-slate-800 dark:text-white">{lead.businessName}</span>
                                        <span className="text-xs text-emerald-400">${(lead.estimatedLoss || computedRevenueLeakage).toLocaleString()}/mo</span>
                                      </div>
                                      <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-sans">
                                        <p>📧 {lead.email || 'contact@client.com'}</p>
                                        <p>📞 {lead.phone || '(555) 000-0000'}</p>
                                      </div>
                                      <div className="pt-1 flex gap-1">
                                        <button onClick={() => { openWorkspaceMatrix(lead); setActivePopoverLeadId(null); }} className="w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer">Open Pitch Deck ➔</button>
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="p-3">
                                  <div className="w-28 space-y-1">
                                    <div className="flex justify-between text-xs font-mono font-bold">
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Health</span>
                                      <span className={lead.overallScore > 75 ? 'text-emerald-400' : 'text-amber-400'}>{lead.overallScore}/100</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden border border-emerald-900/10 dark:border-slate-800/80">
                                      <div
                                        className={`h-full rounded-full ${lead.overallScore > 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${lead.overallScore}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3">
                                  <select
                                    value={lead.stage || 'New Lead'}
                                    onChange={(e) => handleUpdateStage(lead.id, e.target.value as DealStage)}
                                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white rounded-lg text-xs font-semibold border border-emerald-900/10 dark:border-slate-800/80 outline-none cursor-pointer hover:border-slate-700"
                                  >
                                    <option value="New Lead">New Lead</option>
                                    <option value="Pitched">Pitched</option>
                                    <option value="Proposal Sent">Proposal Sent</option>
                                    <option value="Closed Won">Closed Won 🏆</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                  </select>
                                </td>

                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => handleTriggerDealRescueAgent(lead)} className="px-2.5 py-1.5 bg-emerald-950 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold cursor-pointer hover:bg-emerald-900 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                                      Rescue
                                    </button>
                                    <button onClick={() => openWorkspaceMatrix(lead)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer inline-flex items-center gap-1">
                                      Open <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-800 p-3 space-y-3">
                      {filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                          <Search className="w-6 h-6 text-slate-600 dark:text-slate-500" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No accounts match your filters</p>
                        </div>
                      ) : filteredLeads.map((lead) => (
                        <div key={lead.id} className="gsap-card pt-3 first:pt-0 space-y-3 font-sans">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <button onClick={(e) => togglePinLead(lead.id, e)} className="text-slate-500 hover:text-amber-400 cursor-pointer shrink-0 mt-0.5">
                                <Star className={`w-3.5 h-3.5 ${lead.isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{lead.businessName}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">{lead.url}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">{lead.overallScore}/100</span>
                          </div>

                          <select
                            value={lead.stage || 'New Lead'}
                            onChange={(e) => handleUpdateStage(lead.id, e.target.value as DealStage)}
                            className="w-full px-2.5 py-2 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white rounded-xl text-xs font-semibold border border-emerald-900/10 dark:border-slate-800/80 outline-none cursor-pointer"
                          >
                            <option value="New Lead">New Lead</option>
                            <option value="Pitched">Pitched</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Closed Won">Closed Won 🏆</option>
                            <option value="Closed Lost">Closed Lost</option>
                          </select>

                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleTriggerDealRescueAgent(lead)} className="flex-1 py-2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all duration-200">
                              Rescue
                            </button>
                            <button onClick={() => openWorkspaceMatrix(lead)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200">
                              Open Deck
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : viewMode === 'kanban' ? (
                  /* KANBAN BOARD */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
                    {ALL_STAGES.map((stg) => {
                      const stageLeads = filteredLeads.filter((l) => (l.stage || 'New Lead') === stg);
                      return (
                        <div key={stg} onDragOver={handleDragOver} onDrop={(e) => handleDropOnStage(e, stg)} className="bg-white/90 dark:bg-[#121824]/80 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 rounded-2xl p-3 flex flex-col space-y-2 min-h-[300px] backdrop-blur-xl">
                          <div className="flex justify-between items-center border-b border-emerald-900/10 dark:border-slate-800/80 pb-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">{stg}</span>
                            <span className="bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{stageLeads.length}</span>
                          </div>
                          <div className="space-y-2 flex-1">
                            {stageLeads.length === 0 ? (
                              <div className="text-xs text-slate-600 dark:text-slate-500 text-center py-6 border border-dashed border-emerald-900/10 dark:border-slate-800/80 rounded-xl">Drop a deal here</div>
                            ) : stageLeads.map((lead) => (
                              <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)} className="gsap-card bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3 rounded-xl space-y-1.5 cursor-grab shadow-md hover:border-slate-700 hover:bg-slate-800/80 transition-all">
                                <span className="font-bold text-slate-800 dark:text-white font-sans text-xs block truncate">{lead.businessName}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate font-mono">{lead.url}</span>
                                <button onClick={() => openWorkspaceMatrix(lead)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold w-full shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1">Open Deck <ArrowUpRight className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 📋 TRELLO PROJECT MANAGEMENT BOARD VIEW */
                  <ClientTrelloBoard 
                    clientName={activeWorkspaceLead ? activeWorkspaceLead.businessName : "All Client Projects"} 
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE STUDIO & CONTENT ENGINE VIEW */}
          {activeTab === 'pitch' && (
            <div className="max-w-7xl mx-auto p-4 font-mono text-xs space-y-4 mt-4">
              <ContentStudio 
                clientName={activeWorkspaceLead ? activeWorkspaceLead.businessName : "TRK Ministries"} 
              />
            </div>
          )}

          {/* TAB 3: SALES VAULT, INDUSTRY BATTLE CARDS & ROLEPLAY SIMULATOR */}
          {activeTab === 'vault' && (
            <div className="max-w-7xl mx-auto p-4 font-mono text-xs space-y-6 mt-4">
              <div className="bg-white/90 dark:bg-[#121824]/80 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-4 rounded-3xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-400" /> Sales Vault & Battle Cards
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-sans">Pick an industry sector to load field-tested objection counter-pitches.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-1 rounded-2xl flex-wrap">
                  {(['Home Services', 'Legal & Law', 'Dental & Medical', 'B2B & SaaS'] as Industry[]).map((ind) => (
                    <button
                      key={ind}
                      onClick={() => setActiveIndustry(ind)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        activeIndustry === ind ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(customBattleCards[activeIndustry] || []).map((card, idx) => (
                  <div key={idx} className="bg-white/90 dark:bg-[#121824]/80 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-4 rounded-2xl space-y-2 backdrop-blur-xl">
                    <span className="text-amber-400 font-bold text-xs block">{card.objection}</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs font-sans leading-relaxed">{card.response}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(card.response);
                        toast.success("Copied battle card response!");
                      }}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-800 border border-emerald-900/10 dark:border-slate-800/80 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                    >
                      Copy Response
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-4 rounded-3xl space-y-4 shadow-2xl backdrop-blur-xl">
                <span className="text-sm text-purple-300 font-bold uppercase tracking-widest block">Practice Studio</span>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">🎭 AI Objection Role-Play Simulator</h3>

                <div className="bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-4 rounded-2xl">
                  <span className="text-amber-300 font-bold uppercase text-xs block">🗣️ Client Objection:</span>
                  <blockquote className="text-slate-700 dark:text-slate-200 text-xs italic font-sans mt-1">"{roleplayObjection}"</blockquote>
                </div>

                <form onSubmit={handleEvaluateRoleplay} className="space-y-2">
                  <textarea
                    rows={3}
                    required
                    placeholder="Type your counter-pitch answer..."
                    value={userRoleplayResponse}
                    onChange={(e) => setUserRoleplayResponse(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-3.5 text-slate-800 dark:text-white rounded-2xl outline-none focus:border-emerald-500 text-xs font-sans placeholder-slate-500 resize-none"
                  />
                  <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl uppercase tracking-wider shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                    🎯 Evaluate Response
                  </button>
                </form>

                {roleplayFeedback && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-1 animate-fadeIn">
                    <div className="flex justify-between font-bold text-xs">
                      <span className="text-emerald-700 dark:text-emerald-300">Pitch AI Score:</span>
                      <span className="text-emerald-400 font-black">{roleplayFeedback.score}/100</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-sans">{roleplayFeedback.tip}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 📑 FLOATING MULTI-SELECT BULK ACTIONS DOCK */}
      <AnimatePresence>
        {selectedLeadIds.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-[calc(max(20px,env(safe-area-inset-bottom))+60px)] left-1/2 -translate-x-1/2 z-[130] bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 p-2.5 rounded-full shadow-2xl flex items-center gap-3 font-mono text-xs backdrop-blur-xl"
          >
            <span className="px-3 py-1 bg-emerald-600/30 text-emerald-700 dark:text-emerald-200 font-bold rounded-full">
              {selectedLeadIds.length} Selected
            </span>
            <button onClick={handleBulkMarkWon} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Won
            </button>
            <button onClick={() => setSelectedLeadIds([])} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED FLOATING SMART DOCK */}
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
        leads={leads}
        openWorkspaceMatrix={openWorkspaceMatrix}
      />

      {/* KEYBOARD SHORTCUTS MODAL */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* REAL-TIME ACTIVITY STREAM DRAWER */}
      <ActivityDrawer 
        isOpen={isActivityDrawerOpen} 
        onClose={() => setIsActivityDrawerOpen(false)} 
        activities={activityFeed} 
        leads={leads}
        onOpenWorkspace={openWorkspaceMatrix}
      />

      {/* 🔑 INTEGRATION API VAULT DRAWER */}
      <IntegrationSettingsDrawer
        isOpen={isIntegrationDrawerOpen}
        onClose={() => setIsIntegrationDrawerOpen(false)}
        activeClient={activeWorkspaceLead}
      />

      {/* ==================== 🚀 WORKSPACE PRESENTATION DRAWER (iOS SAFE AREA FIX) ==================== */}
      {activeWorkspaceLead && (
        <div className="fixed inset-0 z-[120] bg-slate-100 dark:bg-slate-950 flex flex-col no-print h-[100dvh] w-full overflow-hidden">
          
          {/* 🟢 TOP CONTROL HEADER (CLEARING DYNAMIC ISLAND / NOTCH) */}
          <header className="bg-white dark:bg-slate-900 border-b border-emerald-900/10 dark:border-slate-800/80 px-3 pb-2.5 pt-[max(16px,env(safe-area-inset-top))] font-mono text-xs flex items-center justify-between gap-1.5 shrink-0 z-30 shadow-xl">
            <div className="flex items-center gap-1.5">
              <button
                onClick={closeWorkspaceMatrix}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-sm"
              >
                ✕ Exit
              </button>

              <button
                onClick={() => setIsConfigDeckCollapsed(!isConfigDeckCollapsed)}
                className={`px-2.5 py-1.5 border rounded-xl font-bold text-xs uppercase cursor-pointer transition-all ${
                  !isConfigDeckCollapsed
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-700'
                }`}
              >
                🎛️ {!isConfigDeckCollapsed ? "Hide" : "Edit"}
              </button>
            </div>

            <span className="hidden sm:block text-xs font-semibold text-slate-600 dark:text-slate-300 truncate px-2">
              {wsName || activeWorkspaceLead.businessName}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleLaunchDemoPortal(activeWorkspaceLead.organizationId || 'demo-apex-plumbing')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                👁️ Portal
              </button>
              <button
                onClick={() => { playAudioChime('click'); setShowQrModal(true); }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                📱 QR
              </button>
              <button
                onClick={() => { playAudioChime('click'); setIsQuoteModalOpen(true); }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                🧮 Quote
              </button>
            </div>
          </header>

          {/* 🎛️ FULL CONFIG DECK */}
          {!isConfigDeckCollapsed && (
            <div className="bg-white dark:bg-slate-900 border-b border-emerald-900/10 dark:border-slate-800/80 p-4 font-mono text-sm space-y-3 z-30 shadow-2xl shrink-0 animate-slideDown max-h-[50vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-emerald-900/10 dark:border-slate-800/80 pb-2">
                <span className="text-xs text-emerald-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                  <span>🎛️</span> Lead Configuration Node
                </span>
                <span className="text-sm text-slate-500">Live Edit Mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold block text-xs">Business Name</label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2 text-slate-800 dark:text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold block text-xs">Website Domain</label>
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2 text-slate-800 dark:text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold block text-xs">Monthly Missed Revenue ($)</label>
                  <input
                    type="number"
                    value={wsLoss}
                    onChange={(e) => setWsLoss(Number(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold block text-xs">Industry Sector</label>
                  <select
                    value={activeIndustry}
                    onChange={(e) => setActiveIndustry(e.target.value as Industry)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-emerald-900/10 dark:border-slate-800/80 p-2 text-slate-800 dark:text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Home Services">Home Services</option>
                    <option value="Legal & Law">Legal & Law</option>
                    <option value="Dental & Medical">Dental & Medical</option>
                    <option value="B2B & SaaS">B2B & SaaS</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 🖥️ FULL-SCREEN LIVE AUDIT PREVIEW IFRAME */}
          <div className="flex-1 w-full h-full bg-black relative overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <iframe
              src={liveIframePreviewUrl}
              className="w-full h-full border-none"
              title="White Pine Live Presentation Node"
            />
          </div>

        </div>
      )}

      {/* QR CODE PRESENTATION MODAL */}
      {showQrModal && activeWorkspaceLead && (
        <div className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn no-print" onClick={() => setShowQrModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 p-4 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-mono font-black uppercase text-emerald-400 tracking-widest">Live Audit Phone Transfer</span>
            <div className="bg-white p-4 rounded-2xl border border-emerald-900/10 dark:border-slate-800/80"><QRCode value={window.location.origin + liveIframePreviewUrl} size={210} /></div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono font-bold">Scan to open <span className="text-slate-800 dark:text-white">{wsName}</span> on client device</p>
            <button onClick={() => setShowQrModal(false)} className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-mono text-xs font-bold rounded-xl cursor-pointer min-h-[40px]">✕ Close QR Screen</button>
          </div>
        </div>
      )}

      {/* QUOTER MODAL */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn font-mono text-xs h-[100dvh]">
          <div className="bg-white dark:bg-slate-900 border border-emerald-900/10 dark:border-slate-800/80 border-t-white/80 dark:border-t-white/10 max-w-4xl w-full max-h-[92dvh] overflow-y-auto rounded-3xl p-2 shadow-2xl relative flex flex-col">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setIsQuoteModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-white rounded-full cursor-pointer text-sm font-bold">✕</button>
            </div>
            
            <QuotingEngine 
              clientName={wsName || "Valued Client"} 
              reportUrl={window.location.origin + liveIframePreviewUrl}
              monthlyLeakage={wsLoss}
              industry={activeIndustry}
              isHighContrast={activeThemeMode === 'oled'}
              onCopySummary={() => toast.success("Proposal summary copied to clipboard!")} 
              onDismiss={() => setIsQuoteModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}