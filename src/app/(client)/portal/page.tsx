'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Crown, ClipboardList, Wrench, Zap, BarChart3, Volume2, VolumeX, Target, Settings,
  Star, CreditCard, Camera, FileText, Smartphone,
  MapPin, DollarSign, Globe, Truck, CheckCircle2, AlertCircle, Pin, PinOff, Flame,
  Repeat, Gem, AlertTriangle, Tag, Copy, Send, Phone, MessageCircle, StickyNote,
  Play, Mic, Bot, Clock, Ban, Search, LayoutGrid, Maximize2, Minimize2, Siren,
  Calendar, Inbox, FlaskConical, Drama, Activity, Trophy, X, Headphones, Link2,
  Lightbulb, Rocket, List, ChevronUp, ChevronDown, Hourglass, PartyPopper, Gauge, CalendarClock,
  Check, CheckCheck, Palette,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

// ─── TYPES ───
type UserRole = 'owner' | 'manager' | 'tech';
type LeadStatus = 'won' | 'in_progress' | 'lost' | 'pending' | 'spam';
type LeadSource = 'google_maps' | 'google_lsa' | 'organic_web' | 'truck_wrap';
type FmsStatus = 'synced' | 'manual_needed' | 'not_applicable';
type ThemeAccent = 'indigo' | 'emerald' | 'sapphire' | 'amber';
type LayoutDensity = 'comfortable' | 'compact';

interface ActionItem {
  id: string;
  type: 'lead' | 'review' | 'invoice';
  title: string;
  subtitle: string;
  timestamp: string;
  actionText: string;
}

type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface SmsMessage {
  id: string;
  sender: 'system' | 'customer' | 'staff';
  text: string;
  timestamp: string;
  createdAt?: string;
  status?: MessageDeliveryStatus;
}

interface AiSummary {
  issue: string;
  location: string;
  requestedTime: string;
  issueAudioTime?: number;
  locationAudioTime?: number;
  timeAudioTime?: number;
}

interface ActivityFeedItem {
  id: string;
  customerName: string;
  phone: string;
  address?: string;
  timestamp: string;
  hour: number;
  dateGroup: 'today' | 'earlier';
  createdAt?: string;
  title: string;
  subtitle: string;
  jobCategory: string;
  badge: string;
  badgeColor: string;
  source: LeadSource;
  fmsStatus: FmsStatus;
  fmsJobId?: string;
  estimatedValue: number;
  closedValue?: number;
  status: LeadStatus;
  assignedTechId?: string;
  scheduledAt?: string;
  unrepliedMinutes?: number;
  isVip?: boolean;
  pastJobCount?: number;
  isDuplicate?: boolean;
  duplicateCount?: number;
  isSnoozed?: boolean;
  snoozeUntil?: string;
  isPinned?: boolean;
  dispatchNote?: string;
  aiSummary?: AiSummary;
  hasAudio?: boolean;
  audioDuration?: string;
  transcript?: string;
  history?: { date: string; event: string; statusBadge: string }[];
  chatThread?: SmsMessage[];
}

interface TechPerformance {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  reviewsCollected: number;
  monthlyRank: number;
}

const DEMO_FEED_ITEMS: ActivityFeedItem[] = [
  {
    id: 'demo-1',
    customerName: 'Mark Johnson',
    phone: '555-019-2834',
    address: '104 Main Street, Alexandria, MN',
    timestamp: '10:42 PM',
    hour: 22,
    dateGroup: 'today',
    title: 'After-Hours Emergency Call Intercepted',
    subtitle: 'Water heater actively leaking in basement.',
    jobCategory: 'Water Heater Replacement',
    badge: '🤖 AI Receptionist',
    badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-500/30',
    source: 'google_maps',
    fmsStatus: 'synced',
    fmsJobId: 'JOB-9921',
    estimatedValue: 1800,
    closedValue: 1800,
    status: 'won',
    assignedTechId: 't1',
    unrepliedMinutes: 0,
    isVip: true,
    pastJobCount: 3,
    aiSummary: {
      issue: '50-Gal Water Heater Leaking in Basement',
      issueAudioTime: 4,
      location: '104 Main St, Alexandria, MN',
      locationAudioTime: 18,
      requestedTime: 'Tomorrow @ 8:00 AM',
      timeAudioTime: 28
    },
    hasAudio: true,
    audioDuration: '38s',
    transcript: 'AI: "Thank you for calling Apex. I can dispatch a tech tomorrow at 8:00 AM. May I get your address?"\nCaller: "Yes, 104 Main Street!"\nAI: "Mark is assigned, SMS sent in 30 seconds."',
    history: [
      { date: 'Jul 12, 10:42 PM', event: 'After-Hours Call Intercepted by AI Agent', statusBadge: 'AI Captured' },
      { date: 'Jul 12, 10:43 PM', event: 'Job Auto-Synced to ServiceTitan (#JOB-9921)', statusBadge: 'Synced' },
      { date: 'Jul 13, 11:32 AM', event: 'Invoice Paid ($1,800.00) via Apple Pay', statusBadge: 'Paid' },
    ],
    chatThread: [
      { id: 'c1', sender: 'system', text: 'Apex AI: Thanks for calling! Tech Mark is dispatched for 8:00 AM tomorrow.', timestamp: '10:43 PM' },
      { id: 'c2', sender: 'customer', text: 'Can he bring an extra 50-gallon tank just in case?', timestamp: '10:45 PM' }
    ]
  },
  {
    id: 'demo-2',
    customerName: 'Sarah Miller',
    phone: '555-882-1049',
    address: '410 Maple Ave, Alexandria, MN',
    timestamp: '6:15 PM',
    hour: 18,
    dateGroup: 'today',
    title: 'Database Reactivation Reply Received',
    subtitle: 'Customer replied "YES" to seasonal AC tune-up drip.',
    jobCategory: 'AC Tune-Up Inspection',
    badge: '📈 Past Client Reachout',
    badgeColor: 'bg-purple-50 text-purple-700 border border-purple-500/30',
    source: 'organic_web',
    fmsStatus: 'manual_needed',
    estimatedValue: 450,
    status: 'pending',
    assignedTechId: 't2',
    unrepliedMinutes: 28,
    isVip: false,
    isDuplicate: true,
    duplicateCount: 2,
    aiSummary: {
      issue: 'Requested $79 Seasonal AC Inspection',
      issueAudioTime: 2,
      location: '410 Maple Ave, Alexandria, MN',
      locationAudioTime: 12,
      requestedTime: 'Friday Afternoon',
      timeAudioTime: 22
    },
    history: [
      { date: 'Jul 14, 06:15 PM', event: 'Automated Tune-Up SMS Fired', statusBadge: 'SMS Fired' },
      { date: 'Jul 14, 06:18 PM', event: 'Customer Replied "YES, BOOK ME"', statusBadge: 'Customer Replied' },
      { date: 'Jul 14, 06:22 PM', event: 'Secondary Web Form Submission Merged', statusBadge: 'Merged' }
    ],
    chatThread: [
      { id: 'c3', sender: 'system', text: 'Apex Mechanical: Hi Sarah, time for your $79 AC Tune-Up! Reply YES to book.', timestamp: '6:15 PM' },
      { id: 'c4', sender: 'customer', text: 'YES, please book us for Friday afternoon.', timestamp: '6:18 PM' }
    ]
  },
  {
    id: 'demo-3',
    customerName: 'Dave Miller',
    phone: '555-392-0012',
    address: '882 Oak Lane, Alexandria, MN',
    timestamp: 'Yesterday',
    hour: 14,
    dateGroup: 'earlier',
    title: 'Missed-Call Safety Net Recovered',
    subtitle: 'Main drain backed up, emergency snake completed.',
    jobCategory: 'Main Sewer Line Snaking',
    badge: '💬 Instant Text Auto-Reply',
    badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-500/30',
    source: 'google_lsa',
    fmsStatus: 'synced',
    fmsJobId: 'JOB-8812',
    estimatedValue: 650,
    closedValue: 650,
    status: 'won',
    assignedTechId: 't3',
    unrepliedMinutes: 0,
    isVip: true,
    pastJobCount: 2,
    aiSummary: {
      issue: 'Main Sewer Line Backed Up In Basement',
      issueAudioTime: 5,
      location: '882 Oak Lane, Alexandria, MN',
      locationAudioTime: 14,
      requestedTime: 'Immediate Dispatch',
      timeAudioTime: 20
    },
    history: [
      { date: 'Jul 15, 02:15 PM', event: 'Safety Net Auto-SMS Fired in 11s', statusBadge: 'SMS Fired' }
    ],
    chatThread: [
      { id: 'c5', sender: 'system', text: 'Sorry we missed your call! How can Apex help you today?', timestamp: '2:15 PM' },
      { id: 'c6', sender: 'customer', text: 'Need a main drain snake right away.', timestamp: '2:16 PM' }
    ]
  }
];

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="h-16 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] rounded-2xl border border-slate-200" />
      <div className="h-28 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] rounded-2xl border border-slate-200" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-80 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] rounded-2xl border border-slate-200" />
        <div className="lg:col-span-2 h-80 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] rounded-2xl border border-slate-200" />
      </div>
    </div>
  );
}

function SkeletonBar({ className = '' }: { className?: string }) {
  return <span className={`inline-block bg-slate-200 rounded animate-pulse ${className}`} />;
}

function LeadCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <SkeletonBar className="h-5 w-20 rounded-full" />
        <SkeletonBar className="h-5 w-28 rounded-full" />
      </div>
      <SkeletonBar className="h-4 w-40" />
      <SkeletonBar className="h-3 w-32" />
      <div className="flex gap-2 pt-2">
        <SkeletonBar className="h-8 w-20 rounded-xl" />
        <SkeletonBar className="h-8 w-16 rounded-xl" />
        <SkeletonBar className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export default function CompleteOperationalClientPortal() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'command' | 'telemetry' | 'toolkit'>('command');
  const [quickToolTab, setQuickToolTab] = useState<'review' | 'pay' | 'social'>('review');

  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('comfortable');
  const [selectedTechFilter, setSelectedTechFilter] = useState<string | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [pinnedLeadIds, setPinnedLeadIds] = useState<string[]>(['demo-2']);

  const [expandedAiSummaryIds, setExpandedAiSummaryIds] = useState<string[]>([]);
  const [isExecutiveFocus, setIsExecutiveFocus] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [dispatchEta, setDispatchEta] = useState<string>('30 Mins');
  const [dispatchDateTime, setDispatchDateTime] = useState<string>('');
  const [mobileFocusedLead, setMobileFocusedLead] = useState<ActivityFeedItem | null>(null);

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [openOverflowCardId, setOpenOverflowCardId] = useState<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isOnline, setIsOnline] = useState(true);

  const [accentTheme, setAccentTheme] = useState<ThemeAccent>('indigo');
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);

  const router = useRouter();

  const [isRecordingVoice, setIsRecordingVoice] = useState<string | null>(null);
  const [isVoiceSearching, setIsVoiceSearching] = useState<boolean>(false);

  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [openNoteCardId, setOpenNoteCardId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isHolidayMode, setIsHolidayMode] = useState(false);
  const [weeklyDigestSms, setWeeklyDigestSms] = useState(true);
  const [seoSnapshot, setSeoSnapshot] = useState<{
    domain: string;
    keyword: string;
    rank: string | number | null;
    competitors: { name: string; reviews: number; rating: number }[];
    estimationMode: boolean;
    speedScore: number | null;
    lcp: string | null;
    speedStatus: string | null;
    isRealSpeedData: boolean;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'emergency' | 'unreplied' | 'high_value'>('all');

  const [isCmdKOpen, setIsCmdKOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<ActivityFeedItem | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<{ title: string; text: string } | null>(null);
  const [activeChatLead, setActiveChatLead] = useState<ActivityFeedItem | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [isCampaignLauncherOpen, setIsCampaignLauncherOpen] = useState(false);
  
  const [dispatchTargetLead, setDispatchTargetLead] = useState<ActivityFeedItem | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('t1');

  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [makeWebhookUrl, setMakeWebhookUrl] = useState('https://hook.us1.make.com/sample_apex_automation_webhook');
  const [isFiringWebhook, setIsFiringWebhook] = useState(false);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [, setAudioJumpSecond] = useState<number | null>(null);

  const [replyMessageText, setReplyMessageText] = useState('');
  const [reviewPhone, setReviewPhone] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [socialCaption, setSocialCaption] = useState('Another 5-star job completed by the Apex team in Alexandria! 🛠️');
  const [supportMessage, setSupportMessage] = useState('');
  const [reviewTemplate, setReviewTemplate] = useState('Hi {First_Name}, thanks for choosing Apex! Leave a review: https://g.page/r/apex');
  const [payTemplate, setPayTemplate] = useState('Hi {First_Name}, your invoice of {Amount} is ready: https://pay.stripe.com/apex');

  const [campaignOffer, setCampaignOffer] = useState('$79 Seasonal AC Tune-Up Special');
  const [campaignTargetCount, setCampaignTargetCount] = useState<number>(250);

  const [avgJobTicket, setAvgJobTicket] = useState<number>(450);
  const [monthlyRetainer, setMonthlyRetainer] = useState<number>(599);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isEditingRetainer, setIsEditingRetainer] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const previousStateRef = useRef<ActivityFeedItem[]>([]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipingCardId, setSwipingCardId] = useState<string | null>(null);

  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: 'act-1',
      type: 'lead',
      title: '🚨 Immediate Call Needed',
      subtitle: 'Mark Johnson • Water Heater Leak (12m ago)',
      timestamp: '12m ago',
      actionText: 'Call Back',
    },
    {
      id: 'act-2',
      type: 'review',
      title: '⭐ New 5-Star Review Ready for Social Sync',
      subtitle: 'Sarah T.: "Apex was fast and professional!"',
      timestamp: '1h ago',
      actionText: 'Auto-Post via Webhook',
    }
  ]);

  const [techLeaderboard] = useState<TechPerformance[]>([
    { id: 't1', name: 'Mark Vance', phone: '555-882-9901', avatar: '👨‍🔧', reviewsCollected: 12, monthlyRank: 1 },
    { id: 't2', name: 'Dave Miller', phone: '555-442-1082', avatar: '🛠️', reviewsCollected: 8, monthlyRank: 2 },
    { id: 't3', name: 'Sam Olsen', phone: '555-229-3310', avatar: '⚡', reviewsCollected: 5, monthlyRank: 3 },
  ]);

  const [integrations] = useState([
    { name: 'Google Places & Maps API', status: 'connected', latency: '24ms' },
    { name: 'Make.com / Zapier Webhook Engine', status: 'connected', latency: 'Option B Webhook' },
    { name: 'Twilio SMS & Voice Trunk', status: 'connected', credit: '$18.40' },
    { name: 'ServiceTitan / Jobber Sync', status: 'connected', lastSync: '1m ago' },
    { name: 'Stripe Text-to-Pay Gateway', status: 'attention', message: 'Re-authenticate webhook' },
  ]);

  const toggleAiSummaryAccordion = (leadId: string) => {
    playSynthesizerChime('click');
    setExpandedAiSummaryIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const playSynthesizerChime = (type: 'win' | 'dispatch' | 'click' | 'snooze') => {
    if (isAudioMuted || typeof window === 'undefined') return;

    if ('vibrate' in navigator) {
      if (type === 'click') navigator.vibrate(8);
      else if (type === 'win') navigator.vibrate([20, 40, 20, 40, 80]);
      else if (type === 'dispatch') navigator.vibrate([15, 30, 15]);
      else if (type === 'snooze') navigator.vibrate(30);
    }

    try {
      const win = window as unknown as Record<string, typeof AudioContext>;
      const AudioCtx = window.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'win') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      } else if (type === 'dispatch') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      } else {
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const handleStartVoiceMemo = (leadId: string) => {
    playSynthesizerChime('click');
    setIsRecordingVoice(leadId);
    setTimeout(() => {
      setLeadNotes((prev) => {
        const updated = (prev[leadId] || '') + ' • Spoken: Bring 3/4 inch copper fittings.';
        patchLead(leadId, { dispatchNote: updated });
        return { ...prev, [leadId]: updated };
      });
      setIsRecordingVoice(null);
      playSynthesizerChime('dispatch');
      toast.success('🎙️ Voice Memo Transcribed & Saved!');
    }, 1200);
  };

  const mapApiLeadToFeedItem = (raw: ActivityFeedItem & { createdAt: string }): ActivityFeedItem => {
    const createdAt = new Date(raw.createdAt);
    const now = new Date();
    const isToday = createdAt.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = createdAt.toDateString() === yesterday.toDateString();
    return {
      ...raw,
      timestamp: isToday
        ? createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : isYesterday
        ? 'Yesterday'
        : createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      hour: createdAt.getHours(),
      dateGroup: isToday ? 'today' : 'earlier',
    };
  };

  const loadRealFeed = async () => {
    setIsFeedLoading(true);
    try {
      const res = await fetch('/api/portal/leads');
      if (res.ok) {
        const data = await res.json();
        const mapped: ActivityFeedItem[] = (data.leads || []).map(mapApiLeadToFeedItem);
        setActivityFeed(mapped);
        setPinnedLeadIds(mapped.filter((m) => m.isPinned).map((m) => m.id));
        const notes: Record<string, string> = {};
        mapped.forEach((m) => { if (m.dispatchNote) notes[m.id] = m.dispatchNote; });
        setLeadNotes(notes);
      }
    } catch {}
    setIsFeedLoading(false);
  };

  // Fire-and-forget persistence for lead mutations. No-op in demo mode, since
  // the pitch-deck data isn't backed by real PortalLead rows.
  const patchLead = (id: string, patch: Record<string, unknown>) => {
    if (isDemoMode) return;
    fetch('/api/portal/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (isDemoMode) {
      setActivityFeed(DEMO_FEED_ITEMS);
      setLoading(false);
      setIsFeedLoading(false);
      return;
    }
    loadRealFeed().finally(() => setLoading(false));
    fetch('/api/portal/kpis')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.goal === 'number') setMonthlyGoal(data.goal);
        if (typeof data.retainer === 'number') setMonthlyRetainer(data.retainer);
      })
      .catch(() => {});
    fetch('/api/portal/seo')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setSeoSnapshot(data); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveKpis = (patch: { goal?: number; retainer?: number }) => {
    if (isDemoMode) return;
    fetch('/api/portal/kpis', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
  };

  const handleVoiceSearch = () => {
    playSynthesizerChime('click');
    setIsVoiceSearching(true);
    setTimeout(() => {
      setSearchQuery('Mark');
      setIsVoiceSearching(false);
      toast.success('🔍 Voice Search Filtered: "Mark"');
    }, 1000);
  };

  const togglePinLead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSynthesizerChime('click');
    setPinnedLeadIds((prev) => {
      const isPinned = prev.includes(id);
      patchLead(id, { isPinned: !isPinned });
      if (isPinned) {
        toast.info('📌 Lead Unpinned');
        return prev.filter((item) => item !== id);
      } else {
        toast.success('📌 Lead Pinned to Top');
        return [...prev, id];
      }
    });
  };

  const renderHighlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-400/30 text-amber-700 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const filteredFeed = useMemo(() => {
    const list = activityFeed.filter((item) => {
      if (isExecutiveFocus && item.status === 'won') return false;
      if (item.status === 'spam' && activeFilter !== 'all') return false;
      if (selectedTechFilter && item.assignedTechId !== selectedTechFilter) return false;

      const match = 
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobCategory.toLowerCase().includes(searchQuery.toLowerCase());

      if (!match) return false;
      if (activeFilter === 'emergency') return item.badge.includes('AI') || item.title.includes('After-Hours');
      if (activeFilter === 'unreplied') return (item.unrepliedMinutes || 0) > 0 || item.status === 'pending';
      if (activeFilter === 'high_value') return item.estimatedValue >= 1000;
      return true;
    });

    return list.sort((a, b) => {
      const aPinned = pinnedLeadIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedLeadIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [activityFeed, searchQuery, activeFilter, selectedTechFilter, isExecutiveFocus, pinnedLeadIds]);

  // Stagger-fade entrance for KPI tiles / lead cards on mount, data-load, and
  // tab/view switches. transform (y) + opacity only, so it stays on the
  // compositor and holds 60fps. Re-runs whenever the visible card set changes.
  useGSAP(() => {
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      '.gsap-card',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: reduceMotion ? 0 : 0.25, ease: 'power1.out', stagger: reduceMotion ? 0 : 0.04, overwrite: true }
    );
  }, { scope: pageRef, dependencies: [loading, isFeedLoading, activeTab, viewMode, filteredFeed.length] });

  const trafficLightCounts = useMemo(() => {
    return {
      red: activityFeed.filter((i) => (i.unrepliedMinutes || 0) > 15 || i.status === 'pending').length,
      yellow: activityFeed.filter((i) => i.status === 'in_progress').length,
      green: activityFeed.filter((i) => i.status === 'won').length,
    };
  }, [activityFeed]);

  const contextualChatChips = useMemo(() => {
    if (!activeChatLead) return [];
    const cat = activeChatLead.jobCategory.toLowerCase();

    if (cat.includes('water heater')) {
      return [
        '🚰 We have 50-gal tanks in stock! Tech can arrive at 8:00 AM.',
        '📸 Could you text us a quick photo of the serial rating plate on the tank?',
        '👍 Dispatching technician Mark with emergency replacement unit now.'
      ];
    }
    if (cat.includes('ac') || cat.includes('cooling')) {
      return [
        '❄️ Confirming your $79 AC Tune-Up Inspection slot with Apex.',
        '🛠️ Tech Mark is assigned for Friday afternoon.',
        '🚚 On the way! Tech is arriving in ~20 minutes.'
      ];
    }
    return [
      '🚚 Apex Mechanical: Our tech is en route to your location now!',
      '📸 Could you please text us a quick photo of the unit label?',
      '👍 Confirming your service appointment time with Apex Mechanical.'
    ];
  }, [activeChatLead]);

  const todayLeads = useMemo(() => filteredFeed.filter((i) => i.dateGroup === 'today'), [filteredFeed]);
  const earlierLeads = useMemo(() => filteredFeed.filter((i) => i.dateGroup === 'earlier'), [filteredFeed]);

  useEffect(() => {
    const handleVimKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (viewMode === 'list' && filteredFeed.length > 0) {
        if (e.key === 'j' || e.key === 'J') {
          playSynthesizerChime('click');
          setFocusedIndex((prev) => Math.min(filteredFeed.length - 1, prev + 1));
        } else if (e.key === 'k' || e.key === 'K') {
          playSynthesizerChime('click');
          setFocusedIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === 'Enter') {
          const item = filteredFeed[focusedIndex];
          if (item) {
            playSynthesizerChime('click');
            setActiveChatLead(item);
            toast.info(`💬 Opened chat with ${item.customerName}`);
          }
        }
      }
    };
    window.addEventListener('keydown', handleVimKeys);
    return () => window.removeEventListener('keydown', handleVimKeys);
  }, [viewMode, filteredFeed, focusedIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const missedRevenueAtRisk = useMemo(() => {
    return activityFeed
      .filter((i) => (i.unrepliedMinutes || 0) > 0 || i.status === 'pending')
      .reduce((sum, i) => sum + i.estimatedValue, 0);
  }, [activityFeed]);

  const handleTriggerEodSmsPush = () => {
    playSynthesizerChime('dispatch');
    const wonCount = activityFeed.filter((i) => i.status === 'won').length;
    toast.success('📱 Executive EOD SMS Fired to Owner Cell!', {
      description: `Apex EOD: $${totalClosedRevenue.toLocaleString()} Revenue (${wonCount} Jobs Won) • 0 Missed Calls • Net ROI: ${netRoiRatio}x`,
    });
  };

  useEffect(() => {
    const handleFilterKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'o') { setActiveFilter('unreplied'); playSynthesizerChime('click'); toast.info('Filter: Overdue Leads'); }
      if (key === 'e') { setActiveFilter('emergency'); playSynthesizerChime('click'); toast.info('Filter: Emergency'); }
      if (key === 'h') { setActiveFilter('high_value'); playSynthesizerChime('click'); toast.info('Filter: High Value'); }
      if (key === 'a') { setActiveFilter('all'); playSynthesizerChime('click'); toast.info('Filter: All Leads'); }
    };
    window.addEventListener('keydown', handleFilterKeys);
    return () => window.removeEventListener('keydown', handleFilterKeys);
  }, []);

  useEffect(() => {
    if (activeChatLead) {
      const typingTimer = setTimeout(() => setIsCustomerTyping(true), 1500);
      const stopTimer = setTimeout(() => setIsCustomerTyping(false), 4500);
      return () => { clearTimeout(typingTimer); clearTimeout(stopTimer); };
    }
  }, [activeChatLead]);

  const accentClasses = useMemo(() => {
    switch (accentTheme) {
      case 'emerald':
        return { primaryBtn: 'bg-emerald-600 hover:bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500/30' };
      case 'sapphire':
        return { primaryBtn: 'bg-cyan-600 hover:bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-500/30' };
      case 'amber':
        return { primaryBtn: 'bg-amber-600 hover:bg-amber-500', text: 'text-amber-600', border: 'border-amber-500/30' };
      default:
        return { primaryBtn: 'bg-indigo-600 hover:bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-500/30' };
    }
  }, [accentTheme]);

  const handleRoleChange = (role: UserRole) => {
    playSynthesizerChime('click');
    setCurrentRole(role);
    try {
      localStorage.setItem('apex_portal_user_role', role);
    } catch {}

    if (role === 'owner') {
      setActiveTab('command');
      setActiveFilter('high_value');
    } else if (role === 'manager') {
      setActiveTab('command');
      setActiveFilter('unreplied');
    } else if (role === 'tech') {
      setActiveTab('toolkit');
    }
  };

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('apex_portal_user_role') as UserRole;
      if (savedRole) setCurrentRole(savedRole);
    } catch {}
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleDemoMode = () => {
    playSynthesizerChime('click');
    const nextState = !isDemoMode;
    setIsDemoMode(nextState);

    if (nextState) {
      setActivityFeed(DEMO_FEED_ITEMS);
      setIsFeedLoading(false);
      toast.success('Sales Pitch Demo Data Loaded!');
    } else {
      loadRealFeed();
      toast.info('Demo Mode OFF — Loading Real Client Feed');
    }
  };

  useEffect(() => {
    if (activeChatLead && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeChatLead, activeChatLead?.chatThread, isCustomerTyping]);

  const updateLeadStatus = (id: string, newStatus: LeadStatus) => {
    previousStateRef.current = activityFeed;

    if (newStatus === 'won') {
      playSynthesizerChime('win');
    } else {
      playSynthesizerChime('click');
    }

    let closedVal = 0;
    setActivityFeed((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          closedVal = newStatus === 'won' ? (item.closedValue || item.estimatedValue) : 0;
          return {
            ...item,
            status: newStatus,
            closedValue: closedVal,
            unrepliedMinutes: 0,
            history: [
              ...(item.history || []),
              { date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: `Status updated to ${newStatus.toUpperCase()}`, statusBadge: newStatus }
            ]
          };
        }
        return item;
      })
    );

    patchLead(id, {
      status: newStatus,
      closedValue: closedVal,
      unrepliedMinutes: 0,
      historyEvent: `Status updated to ${newStatus.toUpperCase()}`,
      historyBadge: newStatus,
    });

    toast.success(`Action Executed (${newStatus.toUpperCase()})`, {
      action: {
        label: '↩️ Undo Action',
        onClick: () => {
          const priorItem = previousStateRef.current.find((i) => i.id === id);
          setActivityFeed(previousStateRef.current);
          if (priorItem) {
            patchLead(id, {
              status: priorItem.status,
              closedValue: priorItem.closedValue ?? 0,
              unrepliedMinutes: priorItem.unrepliedMinutes ?? 0,
              historyEvent: 'Action Reverted',
              historyBadge: priorItem.status,
            });
          }
          toast.info('↩️ Action Reverted Successfully');
        }
      }
    });
  };

  const handleCopyText = (text: string, label: string) => {
    playSynthesizerChime('click');
    navigator.clipboard.writeText(text);
    toast.success(`📋 Copied ${label} to Clipboard!`, { description: text });
  };

  const toggleLeadSelection = (id: string) => {
    playSynthesizerChime('click');
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchSnooze = () => {
    playSynthesizerChime('snooze');
    const count = selectedLeadIds.length;
    selectedLeadIds.forEach((id) => patchLead(id, { isSnoozed: true, snoozeUntil: '30m' }));
    setActivityFeed((prev) =>
      prev.map((item) =>
        selectedLeadIds.includes(item.id) ? { ...item, isSnoozed: true, snoozeUntil: '30m' } : item
      )
    );
    setSelectedLeadIds([]);
    toast.success(`⏰ Batch Snoozed ${count} Lead(s) for 30 Mins`);
  };

  const handleBatchWon = () => {
    playSynthesizerChime('win');
    const count = selectedLeadIds.length;
    selectedLeadIds.forEach((id) => patchLead(id, { status: 'won', unrepliedMinutes: 0, historyEvent: 'Status updated to WON', historyBadge: 'won' }));
    setActivityFeed((prev) =>
      prev.map((item) =>
        selectedLeadIds.includes(item.id) ? { ...item, status: 'won', unrepliedMinutes: 0 } : item
      )
    );
    setSelectedLeadIds([]);
    toast.success(`🟢 Batch Marked ${count} Lead(s) WON!`);
  };

  const handleSnoozeLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSynthesizerChime('snooze');

    setActivityFeed((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const snoozeTime = new Date(Date.now() + 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          patchLead(id, { isSnoozed: true, snoozeUntil: snoozeTime });
          toast.success(`⏰ Lead Snoozed for 30 Mins`, {
            description: `Reminder scheduled for ${snoozeTime}`,
          });
          return { ...item, isSnoozed: true, snoozeUntil: snoozeTime };
        }
        return item;
      })
    );
  };

  const handleSendSelfTestLead = async () => {
    playSynthesizerChime('dispatch');

    const testPayload = {
      customerName: 'Self Test Lead',
      phone: '555-123-4567',
      address: '777 Test Lane, Alexandria, MN',
      title: '🧪 Live Speed-to-Lead Test Executed',
      subtitle: 'Instant SMS auto-reply triggered in 4.2 seconds.',
      jobCategory: 'General Service Test',
      badge: '⚡ Speed-to-Lead',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-500/30',
      source: 'organic_web',
      fmsStatus: 'synced',
      estimatedValue: 250,
      status: 'pending',
      isVip: true,
      hasAudio: false,
      aiSummary: {
        issue: 'Test System Health & Auto-SMS Speed',
        location: '777 Test Lane, Alexandria, MN',
        requestedTime: 'Immediate',
      },
      firstMessage: 'Apex AI: Thanks for contacting us! A tech will confirm shortly.',
    };

    if (isDemoMode) {
      const testItem: ActivityFeedItem = {
        id: `test_${Date.now()}`,
        customerName: testPayload.customerName,
        phone: testPayload.phone,
        address: testPayload.address,
        timestamp: 'Just Now',
        hour: new Date().getHours(),
        dateGroup: 'today',
        title: testPayload.title,
        subtitle: testPayload.subtitle,
        jobCategory: testPayload.jobCategory,
        badge: testPayload.badge,
        badgeColor: testPayload.badgeColor,
        source: 'organic_web',
        fmsStatus: 'synced',
        fmsJobId: 'TEST-101',
        estimatedValue: 250,
        status: 'pending',
        unrepliedMinutes: 0,
        isVip: true,
        pastJobCount: 1,
        aiSummary: {
          issue: 'Test System Health & Auto-SMS Speed',
          issueAudioTime: 3,
          location: '777 Test Lane, Alexandria, MN',
          locationAudioTime: 10,
          requestedTime: 'Immediate',
          timeAudioTime: 16
        },
        chatThread: [
          { id: 'm1', sender: 'system', text: testPayload.firstMessage, timestamp: 'Just now' }
        ]
      };
      setActivityFeed((prev) => [testItem, ...prev]);
      toast.success('🧪 Test Lead Injected! Auto-SMS Fired in 4.2s.');
      return;
    }

    try {
      const res = await fetch('/api/portal/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setActivityFeed((prev) => [mapApiLeadToFeedItem(data.lead), ...prev]);
        toast.success('🧪 Test Lead Injected! Auto-SMS Fired in 4.2s.');
      } else {
        toast.error('Could not create test lead');
      }
    } catch {
      toast.error('Could not create test lead');
    }
  };

  // Applies a delivery-status transition to one message, in both the feed
  // list and (if it's the one currently open) the chat modal's own copy.
  const updateMessageStatus = (leadId: string, messageId: string, status: MessageDeliveryStatus) => {
    const patchThread = (thread?: SmsMessage[]) =>
      (thread || []).map((m) => (m.id === messageId ? { ...m, status } : m));

    setActivityFeed((prev) =>
      prev.map((item) => (item.id === leadId ? { ...item, chatThread: patchThread(item.chatThread) } : item))
    );
    setActiveChatLead((prev) => (prev && prev.id === leadId ? { ...prev, chatThread: patchThread(prev.chatThread) } : prev));
  };

  const handleSendSmsReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessageText.trim() || !activeChatLead) return;

    playSynthesizerChime('dispatch');
    const leadId = activeChatLead.id;
    const messageId = `msg_${Date.now()}`;
    const newMessage: SmsMessage = {
      id: messageId,
      sender: 'staff',
      text: replyMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
    };

    // Optimistic insert — message appears instantly at "sending", before
    // the network call (or its demo-mode stand-in) resolves.
    setActivityFeed((prev) =>
      prev.map((item) =>
        item.id === leadId
          ? { ...item, chatThread: [...(item.chatThread || []), newMessage], unrepliedMinutes: 0 }
          : item
      )
    );
    setActiveChatLead((prev) =>
      prev ? { ...prev, chatThread: [...(prev.chatThread || []), newMessage], unrepliedMinutes: 0 } : null
    );
    setReplyMessageText('');

    // Simulated carrier delivery receipt, then a simulated read receipt —
    // this app has no real SMS webhook wired up, so both modes get the
    // same believable sent -> delivered -> read progression.
    const simulateDeliveryLifecycle = () => {
      updateMessageStatus(leadId, messageId, 'sent');
      setTimeout(() => updateMessageStatus(leadId, messageId, 'delivered'), 900);
      setTimeout(() => updateMessageStatus(leadId, messageId, 'read'), 2600 + Math.random() * 1800);
    };

    if (isDemoMode) {
      setTimeout(simulateDeliveryLifecycle, 350);
    } else {
      fetch('/api/portal/leads/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, sender: 'staff', text: newMessage.text }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('send failed');
          simulateDeliveryLifecycle();
        })
        .catch(() => updateMessageStatus(leadId, messageId, 'failed'));
    }

    toast.success(`💬 SMS Sent to ${activeChatLead.customerName}`);
  };

  const toDateTimeLocalValue = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const setDispatchQuickEta = (label: string, minutesFromNow: number) => {
    setDispatchEta(label);
    // eslint-disable-next-line react-hooks/purity -- only invoked from onClick handlers, never during render
    setDispatchDateTime(toDateTimeLocalValue(new Date(Date.now() + minutesFromNow * 60000)));
  };

  useEffect(() => {
    if (!dispatchTargetLead) return;
    setDispatchDateTime(
      dispatchTargetLead.scheduledAt
        ? toDateTimeLocalValue(new Date(dispatchTargetLead.scheduledAt))
        : toDateTimeLocalValue(new Date(Date.now() + 30 * 60000))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchTargetLead?.id]);

  const handleDispatchToTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTargetLead) return;

    const assignedTech = techLeaderboard.find((t) => t.id === selectedTechId) || techLeaderboard[0];
    // eslint-disable-next-line react-hooks/purity -- only invoked from this form's onSubmit, never during render
    const scheduledDate = dispatchDateTime ? new Date(dispatchDateTime) : new Date(Date.now() + 30 * 60000);
    const scheduledIso = scheduledDate.toISOString();
    const formattedSchedule = scheduledDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    playSynthesizerChime('dispatch');

    const leadId = dispatchTargetLead.id;
    setActivityFeed((prev) =>
      prev.map((item) =>
        item.id === leadId
          ? {
              ...item,
              assignedTechId: selectedTechId,
              scheduledAt: scheduledIso,
              status: item.status === 'pending' ? 'in_progress' : item.status,
            }
          : item
      )
    );

    patchLead(leadId, {
      assignedTechId: selectedTechId,
      scheduledAt: scheduledIso,
      ...(dispatchTargetLead.status === 'pending' ? { status: 'in_progress' } : {}),
      historyEvent: `Dispatched to ${assignedTech.name} for ${formattedSchedule}`,
      historyBadge: 'dispatched',
    });

    toast.success(`📲 Job Packet Dispatched to ${assignedTech.name}`, {
      description: `Scheduled for ${formattedSchedule} • SMS sent to ${assignedTech.phone}.`,
    });

    setDispatchTargetLead(null);
  };

  const handleCopyAiSummary = (summary: AiSummary, customerName: string) => {
    playSynthesizerChime('click');
    const formatted = `APEX JOB NOTES (${customerName}):\n• Issue: ${summary.issue}\n• Location: ${summary.location}\n• Time Requested: ${summary.requestedTime}`;
    navigator.clipboard.writeText(formatted);
    toast.success('📋 AI Notes Copied to Clipboard!');
  };

  const handleJumpAudioTimestamp = (leadId: string, timestampSeconds: number, label: string) => {
    playSynthesizerChime('click');
    setPlayingAudioId(leadId);
    setAudioJumpSecond(timestampSeconds);
    toast.success(`▶️ Audio Jumped to ${label} (${timestampSeconds}s mark)`);
  };

  const handleTouchStart = (e: React.TouchEvent, leadId: string) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingCardId(leadId);
  };

  const handleTouchEnd = (e: React.TouchEvent, item: ActivityFeedItem) => {
    if (touchStartX === null || swipingCardId !== item.id) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;

    if (deltaX > 80) {
      updateLeadStatus(item.id, 'won');
      toast.success(`👉 Swiped Right: ${item.customerName} Marked WON!`);
    } else if (deltaX < -80) {
      playSynthesizerChime('click');
      setActiveChatLead(item);
      toast.info(`👈 Swiped Left: Opened Chat with ${item.customerName}`);
    }

    setTouchStartX(null);
    setSwipingCardId(null);
  };

  const toggleAudioPlayback = (id: string) => {
    playSynthesizerChime('click');
    if (playingAudioId === id) {
      setPlayingAudioId(null);
      setAudioJumpSecond(null);
      toast.info('⏸️ Call Playback Paused');
    } else {
      setPlayingAudioId(id);
      setAudioJumpSecond(0);
      toast.success('▶️ Playing Intercepted AI Call Audio');
    }
  };

  const getContextualNextAction = (item: ActivityFeedItem) => {
    if ((item.unrepliedMinutes || 0) > 15) {
      return { label: 'Next Step: Immediate Callback Needed', action: () => window.location.href = `tel:${item.phone}`, bg: 'bg-rose-50 text-rose-700 border border-rose-500/40' };
    }
    if (item.status === 'pending') {
      return { label: 'Next Step: Dispatch Tech or Send Route SMS', action: () => setDispatchTargetLead(item), bg: 'bg-purple-50 text-purple-700 border border-purple-500/40' };
    }
    if (item.status === 'in_progress') {
      return { label: `Next Step: Send Text-to-Pay Invoice ($${item.estimatedValue})`, action: () => { setPayPhone(item.phone); setPayAmount(item.estimatedValue.toString()); setQuickToolTab('pay'); }, bg: 'bg-emerald-50 text-emerald-700 border border-emerald-500/40' };
    }
    return { label: 'Next Step: Google Review Requested Automatically', action: () => setSelectedCustomer(item), bg: 'bg-slate-100 text-slate-700 border border-slate-200' };
  };

  const renderSlaDecayBar = (unrepliedMinutes?: number) => {
    if (!unrepliedMinutes || unrepliedMinutes === 0) return null;
    if (unrepliedMinutes <= 5) return <div className="h-[2px] w-full bg-emerald-500 rounded-t-xl" />;
    if (unrepliedMinutes <= 12) return <div className="h-[2px] w-full bg-amber-500 rounded-t-xl" />;
    return <div className="h-[2px] w-full bg-rose-500 animate-pulse rounded-t-xl" />;
  };

  const fireAutomationWebhook = async (eventType: string, payloadData: unknown) => {
    playSynthesizerChime('dispatch');
    setIsFiringWebhook(true);

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      client: 'Apex Mechanical Services',
      data: payloadData
    };

    try {
      if (makeWebhookUrl.includes('sample_apex')) {
        await new Promise((r) => setTimeout(r, 600));
        toast.success(`⚡ [Option B Webhook Fired]: ${eventType}`, {
          description: `Dispatched to Make.com / Zapier URL`,
        });
      } else {
        const res = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success(`⚡ Webhook Successfully Received by Make.com!`);
        } else {
          toast.error(`⚠️ Webhook Response Error: ${res.status}`);
        }
      }
    } catch {
      toast.success(`⚡ Webhook Dispatched to Automation Endpoint`);
    } finally {
      setIsFiringWebhook(false);
    }
  };

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    fireAutomationWebhook('DATABASE_CAMPAIGN_LAUNCH', {
      offer: campaignOffer,
      targetCount: campaignTargetCount,
      estimatedRevenue: '$1,350+'
    });
    setIsCampaignLauncherOpen(false);
  };

  const handlePublishSocialProof = (e: React.FormEvent) => {
    e.preventDefault();
    fireAutomationWebhook('SOCIAL_PROOF_POST', {
      caption: socialCaption,
      platforms: ['Facebook', 'Instagram', 'Google Business Profile'],
      source: 'Google 5-Star Review Auto-Graphic'
    });
    setSocialCaption('');
  };

  const filterCounts = useMemo(() => {
    return {
      all: activityFeed.length,
      unreplied: activityFeed.filter((i) => (i.unrepliedMinutes || 0) > 0 || i.status === 'pending').length,
      emergency: activityFeed.filter((i) => i.badge.includes('AI') || i.title.includes('After-Hours')).length,
      high_value: activityFeed.filter((i) => i.estimatedValue >= 1000).length
    };
  }, [activityFeed]);

  const pendingActionCount = useMemo(() => {
    return activityFeed.filter((i) => i.status === 'pending' || (i.unrepliedMinutes || 0) > 0).length;
  }, [activityFeed]);

  const totalClosedRevenue = useMemo(() => {
    return activityFeed
      .filter((i) => i.status === 'won')
      .reduce((sum, i) => sum + (i.closedValue || i.estimatedValue || 0), 0);
  }, [activityFeed]);

  const revenueGoalPercent = Math.min(100, Math.round((totalClosedRevenue / monthlyGoal) * 100));
  const netRoiRatio = (totalClosedRevenue / monthlyRetainer).toFixed(1);

  const peakCallHours = useMemo(() => {
    const hours = Array(24).fill(0);
    activityFeed.forEach((item) => { hours[item.hour] += 1; });
    return hours;
  }, [activityFeed]);

  const revenueTrendByDay = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      return { label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), key: d.toDateString(), won: 0 };
    });
    activityFeed.forEach((item) => {
      if (item.status !== 'won' || !item.createdAt) return;
      const bucket = days.find((d) => d.key === new Date(item.createdAt!).toDateString());
      if (bucket) bucket.won += item.closedValue || item.estimatedValue || 0;
    });
    return days;
  }, [activityFeed]);

  const avgSpeedToLeadSeconds = useMemo(() => {
    const diffsSeconds: number[] = [];
    activityFeed.forEach((item) => {
      if (!item.createdAt || !item.chatThread || item.chatThread.length === 0) return;
      const firstReply = item.chatThread[0];
      if (firstReply.sender !== 'system' || !firstReply.createdAt) return;
      const diff = (new Date(firstReply.createdAt).getTime() - new Date(item.createdAt).getTime()) / 1000;
      if (diff >= 0) diffsSeconds.push(diff);
    });
    if (diffsSeconds.length === 0) return null;
    return Math.round(diffsSeconds.reduce((a, b) => a + b, 0) / diffsSeconds.length);
  }, [activityFeed]);

  const scheduledAgenda = useMemo(() => {
    const scheduled = filteredFeed
      .filter((item) => !!item.scheduledAt)
      .slice()
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const groups: { key: string; label: string; items: ActivityFeedItem[] }[] = [];
    scheduled.forEach((item) => {
      const d = new Date(item.scheduledAt!);
      const key = d.toDateString();
      let label = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      if (key === today.toDateString()) label = `Today • ${label}`;
      else if (key === tomorrow.toDateString()) label = `Tomorrow • ${label}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, label, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [filteredFeed]);

  const channelBreakdown = useMemo(() => {
    const bySource: Record<LeadSource, { count: number; won: number; revenue: number }> = {
      google_maps: { count: 0, won: 0, revenue: 0 },
      google_lsa: { count: 0, won: 0, revenue: 0 },
      organic_web: { count: 0, won: 0, revenue: 0 },
      truck_wrap: { count: 0, won: 0, revenue: 0 },
    };
    activityFeed.forEach((item) => {
      const bucket = bySource[item.source];
      if (!bucket) return;
      bucket.count += 1;
      if (item.status === 'won') {
        bucket.won += 1;
        bucket.revenue += item.closedValue || item.estimatedValue || 0;
      }
    });
    return bySource;
  }, [activityFeed]);

  const renderSourceTag = (source: LeadSource) => {
    switch (source) {
      case 'google_maps':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-500/30 px-3 py-1 rounded-full font-sans"><MapPin className="w-3 h-3" /> Google Maps</span>;
      case 'google_lsa':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-500/30 px-3 py-1 rounded-full font-sans"><DollarSign className="w-3 h-3" /> Google LSA</span>;
      case 'organic_web':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-500/30 px-3 py-1 rounded-full font-sans"><Globe className="w-3 h-3" /> Web Organic</span>;
      case 'truck_wrap':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-500/30 px-3 py-1 rounded-full font-sans"><Truck className="w-3 h-3" /> Direct / Wrap</span>;
    }
  };

  const renderFmsBadge = (status: FmsStatus, jobId?: string) => {
    if (status === 'synced') {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-500/30 px-3 py-1 rounded-full font-sans"><CheckCircle2 className="w-3 h-3" /> Synced to ServiceTitan <span className="font-mono tabular-nums">{jobId}</span></span>;
    }
    if (status === 'manual_needed') {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-500/30 px-3 py-1 rounded-full font-sans"><AlertCircle className="w-3 h-3" /> Manual Dispatch</span>;
    }
    return null;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const renderLeadCard = (item: ActivityFeedItem, globalIndex: number) => {
    const isOverdueSla = (item.unrepliedMinutes || 0) > 15;
    const isWon = item.status === 'won';
    const isSelected = selectedLeadIds.includes(item.id);
    const isPinned = pinnedLeadIds.includes(item.id);
    const isHotLead = item.estimatedValue >= 1500 || item.jobCategory.toLowerCase().includes('replacement');
    const isVimFocused = globalIndex === focusedIndex && viewMode === 'list';
    const isMobileFocused = mobileFocusedLead?.id === item.id;
    const isAiSummaryExpanded = expandedAiSummaryIds.includes(item.id);
    const nextAction = getContextualNextAction(item);
    const isOverflowOpen = openOverflowCardId === item.id;

    if (layoutDensity === 'compact') {
      return (
        <div
          key={item.id}
          onClick={() => setMobileFocusedLead(item)}
          className={`gsap-card p-3 rounded-xl flex items-center justify-between gap-2 border cursor-pointer transition-all duration-200 active:scale-[0.98] ${
            isPinned ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-500/50' : ''
          } ${
            isVimFocused || isMobileFocused ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''
          } ${
            isWon
              ? 'bg-emerald-50 border-emerald-500/20 opacity-70'
              : 'bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-indigo-50 '
          }`}
        >
          <div className="flex items-center gap-2 font-sans text-xs">
            <button 
              onClick={(e) => togglePinLead(item.id, e)} 
              className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0.5 rounded hover:bg-slate-100 flex items-center justify-center ${isPinned ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
              title={isPinned ? 'Unpin Lead' : 'Pin to Top'}
              aria-label={isPinned ? 'Unpin lead' : 'Pin lead to top'}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>

            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleLeadSelection(item.id)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer shrink-0"
            />

            {isHotLead && <span title="Hot High-Margin Opportunity" className="text-orange-600 flex items-center"><Flame className="w-3.5 h-3.5" /></span>}

            <button onClick={() => setSelectedCustomer(item)} className="font-bold underline underline-offset-2 text-slate-800">
              {renderHighlightText(item.customerName, searchQuery)}
            </button>
            <span className="text-slate-600 font-mono tabular-nums text-xs">{renderHighlightText(item.phone, searchQuery)}</span>
            <span className="text-slate-600 hidden sm:inline">• {renderHighlightText(item.jobCategory, searchQuery)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-emerald-600 font-mono tabular-nums">${item.estimatedValue}</span>
            
            <button onClick={() => updateLeadStatus(item.id, 'won')} className={`min-h-[44px] sm:min-h-0 px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1 ${isWon ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-gray-600'}`}>
              {isWon && <CheckCircle2 className="w-3 h-3" />} {isWon ? 'Won' : 'Mark Won'}
            </button>

            <button onClick={() => setDispatchTargetLead(item)} className="min-h-[44px] sm:min-h-0 px-2.5 py-1 bg-purple-600/30 text-purple-700 rounded text-xs font-bold">
              Dispatch
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={item.id} 
        onClick={() => setMobileFocusedLead(item)}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => handleTouchStart(e, item.id)}
        onTouchEnd={(e) => handleTouchEnd(e, item)}
        className={`gsap-card rounded-2xl space-y-2.5 cursor-pointer transition-all duration-200 select-none relative overflow-hidden hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 ${
          isPinned ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-500/50 ' : ''
        } ${
          isVimFocused || isMobileFocused ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''
        } ${
          item.isSnoozed ? 'opacity-40 grayscale border border-dashed border-gray-600' :
          isWon
            ? 'bg-emerald-50 border border-emerald-500/30 opacity-75'
            : isOverdueSla
            ? 'bg-rose-50 border-l-4 border-l-rose-500 border-y border-r border-rose-500/40 animate-pulse '
            : 'bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-l-4 border-l-amber-500 border-y border-r border-slate-200 text-slate-800 hover:border-r-slate-700 hover:border-y-slate-700 '
        } ${isSelected ? 'ring-2 ring-indigo-500/80' : ''}`}
      >
        {renderSlaDecayBar(item.unrepliedMinutes)}

        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-start gap-3">
              
              <div className="flex flex-col items-center gap-1.5 mt-0.5">
                <button
                  onClick={(e) => togglePinLead(item.id, e)}
                  className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 transition-transform cursor-pointer flex items-center justify-center ${isPinned ? 'scale-125 opacity-100' : 'opacity-30 hover:opacity-100'}`}
                  title={isPinned ? 'Unpin Lead' : 'Pin to Top'}
                  aria-label={isPinned ? 'Unpin lead' : 'Pin lead to top'}
                >
                  {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>

                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleLeadSelection(item.id)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-1.5 font-sans">
                  {isPinned && (
                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-500/40 px-3 py-1 rounded-full font-bold">
                      <Pin className="w-3 h-3" /> Pinned Priority
                    </span>
                  )}

                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${item.badgeColor}`}>{item.badge}</span>

                  {isHotLead && (
                    <span className="text-xs bg-orange-50 text-rose-700 border border-rose-500/40 px-3 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      <span>High-Margin Opportunity</span>
                      <span className="font-mono tabular-nums">(${item.estimatedValue})</span>
                    </span>
                  )}

                  {item.isDuplicate && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-500/40 px-3 py-1 rounded-full font-bold">
                      <Repeat className="w-3 h-3" /> Repeat Inquiry
                    </span>
                  )}

                  {item.isVip && (
                    <button
                      onClick={() => { playSynthesizerChime('click'); setSelectedCustomer(item); }}
                      className="text-xs bg-amber-50 text-amber-700 border border-amber-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Gem className="w-3 h-3" />
                      <span>VIP</span>
                      <span className="opacity-80 font-mono tabular-nums">({item.pastJobCount || 2} Jobs)</span>
                    </button>
                  )}

                  {renderSourceTag(item.source)}
                  {renderFmsBadge(item.fmsStatus, item.fmsJobId)}

                  {isOverdueSla && (
                    <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-500/50 px-3 py-1 rounded-full font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Customer Waiting ({item.unrepliedMinutes}m)
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full">
                    <Tag className="w-3 h-3" /> {renderHighlightText(item.jobCategory, searchQuery)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button onClick={() => { playSynthesizerChime('click'); setSelectedCustomer(item); }} className="text-slate-800 hover:text-indigo-600 font-bold text-sm font-sans underline underline-offset-2 cursor-pointer">
                    {renderHighlightText(item.customerName, searchQuery)}
                  </button>

                  <button
                    onClick={() => handleCopyText(item.phone, 'Phone Number')}
                    aria-label="Copy phone number"
                    className="min-h-[44px] sm:min-h-0 text-slate-600 hover:text-slate-800 font-mono tabular-nums text-xs flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 transition-all cursor-pointer"
                  >
                    <span>{renderHighlightText(item.phone, searchQuery)}</span>
                    <Copy className="w-3 h-3" />
                  </button>

                  {item.address && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(item.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playSynthesizerChime('click')}
                        className="text-xs text-blue-600 hover:underline font-sans flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-500/30"
                      >
                        <MapPin className="w-3 h-3" /> {renderHighlightText(item.address, searchQuery)} (Navigate)
                      </a>
                      <button
                        onClick={() => handleCopyText(item.address!, 'Address')}
                        aria-label="Copy address"
                        className="min-h-[44px] sm:min-h-0 text-slate-600 hover:text-slate-800 text-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1.5 font-sans text-xs">
                  <span className="text-emerald-600 font-bold">● Intercepted</span>
                  <span className="text-gray-600">──</span>
                  <span className={item.status === 'in_progress' || isWon ? 'text-indigo-600 font-bold' : 'text-gray-600'}>
                    {item.status === 'in_progress' || isWon ? '● Dispatched' : '○ Pending Dispatch'}
                  </span>
                  <span className="text-gray-600">──</span>
                  <span className={isWon ? 'text-emerald-600 font-bold' : 'text-gray-600'}>
                    {isWon ? '● Paid & Closed' : '○ Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 font-sans">
              <button
                onClick={() => { playSynthesizerChime('click'); setDispatchTargetLead(item); }}
                className="min-h-[44px] sm:min-h-[32px] px-3 py-1 bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-700 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch
              </button>

              <a
                href={`tel:${item.phone}`}
                onClick={() => playSynthesizerChime('click')}
                className="min-h-[44px] sm:min-h-[32px] px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>

              <button
                onClick={() => { playSynthesizerChime('click'); setActiveChatLead(item); }}
                className="min-h-[44px] sm:min-h-[32px] px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Chat (<span className="font-mono tabular-nums">{item.chatThread?.length || 0}</span>)
              </button>

              <button 
                onClick={() => setOpenOverflowCardId(isOverflowOpen ? null : item.id)}
                className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                •••
              </button>
            </div>
          </div>

          {isOverflowOpen && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs">
              <button
                onClick={() => setOpenNoteCardId(openNoteCardId === item.id ? null : item.id)}
                className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-500/40 rounded-lg font-bold flex items-center gap-1"
              >
                <StickyNote className="w-3.5 h-3.5" /> Add Note
              </button>

              <button
                onClick={(e) => handleSnoozeLead(item.id, e)}
                className="px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg font-bold flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" /> {item.isSnoozed ? <>Snoozed (<span className="font-mono tabular-nums">{item.snoozeUntil}</span>)</> : 'Snooze 30m'}
              </button>

              {item.hasAudio && (
                <button
                  onClick={() => toggleAudioPlayback(item.id)}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-500/40 rounded-lg font-bold flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" /> Play Call Audio (<span className="font-mono tabular-nums">{item.audioDuration || '38s'}</span>)
                </button>
              )}
            </div>
          )}

          {(openNoteCardId === item.id || leadNotes[item.id]) && (
            <div className="bg-slate-50 border border-indigo-500/30 p-2.5 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between items-center text-xs text-indigo-600 font-bold uppercase">
                <span className="inline-flex items-center gap-1"><StickyNote className="w-3.5 h-3.5" /> Dispatch Staff Quick Note</span>
                {openNoteCardId === item.id && (
                  <button onClick={() => setOpenNoteCardId(null)} className="text-gray-600 hover:text-slate-800">Close Box</button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={leadNotes[item.id] || ''}
                  onChange={(e) => setLeadNotes({ ...leadNotes, [item.id]: e.target.value })}
                  onBlur={(e) => patchLead(item.id, { dispatchNote: e.target.value })}
                  placeholder="Add quick dispatch note or tap mic to speak..."
                  className="flex-1 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 text-xs min-h-[44px] sm:min-h-0"
                />

                <button
                  type="button"
                  onClick={() => handleStartVoiceMemo(item.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${
                    isRecordingVoice === item.id
                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-500/40 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" /> {isRecordingVoice === item.id ? 'Listening...' : 'Voice'}
                </button>
              </div>
            </div>
          )}

          {/* AI CALL SUMMARY ACCORDION */}
          {item.aiSummary && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => toggleAiSummaryAccordion(item.id)}
                className="w-full px-3 py-2 flex justify-between items-center text-left hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold text-indigo-600 text-xs">
                    AI Call Summary: <span className="text-slate-800 font-normal">{item.aiSummary.issue}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-semibold">{item.aiSummary.requestedTime}</span>
                  {isAiSummaryExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                </div>
              </button>

              {isAiSummaryExpanded && (
                <div className="p-3 pt-1 border-t border-slate-200 space-y-2 text-xs font-sans text-slate-500 bg-slate-50">
                  <div className="flex justify-between items-center text-xs text-indigo-600 font-bold uppercase tracking-wider">
                    <span>AI Key Takeaways (Tap bullet to jump audio)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAiSummary(item.aiSummary!, item.customerName)}
                      className="text-xs text-gray-600 hover:text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Notes
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div
                      onClick={() => handleJumpAudioTimestamp(item.id, item.aiSummary?.issueAudioTime || 4, 'Issue')}
                      className="cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors border border-slate-100"
                    >
                      <strong className="text-gray-600 text-xs flex items-center gap-1"><Target className="w-3 h-3" /> ISSUE:</strong>
                      <span className="text-slate-800 font-medium">{item.aiSummary.issue}</span>
                    </div>
                    <div
                      onClick={() => handleJumpAudioTimestamp(item.id, item.aiSummary?.locationAudioTime || 18, 'Location')}
                      className="cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors border border-slate-100"
                    >
                      <strong className="text-gray-600 text-xs flex items-center gap-1"><Target className="w-3 h-3" /> LOCATION:</strong>
                      <span className="text-slate-800 font-medium">{item.aiSummary.location}</span>
                    </div>
                    <div
                      onClick={() => handleJumpAudioTimestamp(item.id, item.aiSummary?.timeAudioTime || 28, 'Time')}
                      className="cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors border border-slate-100"
                    >
                      <strong className="text-gray-600 text-xs flex items-center gap-1"><Target className="w-3 h-3" /> REQUESTED TIME:</strong>
                      <span className="text-emerald-600 font-semibold">{item.aiSummary.requestedTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-1.5 border-t border-slate-100 gap-2 text-xs">
            <button
              onClick={nextAction.action}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all hover:scale-[1.01] text-xs flex items-center gap-1 ${nextAction.bg}`}
            >
              <Lightbulb className="w-3.5 h-3.5" /> <span>{nextAction.label}</span>
            </button>

            <div className="flex items-center gap-1">
              <span className="text-gray-600 uppercase font-bold text-xs">Outcome:</span>
              <button onClick={() => updateLeadStatus(item.id, 'won')} className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${item.status === 'won' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-gray-600'}`}>
                <CheckCircle2 className="w-3 h-3" /> Won (+<span className="font-mono tabular-nums">${item.closedValue || item.estimatedValue}</span>)
              </button>
              <button onClick={() => updateLeadStatus(item.id, 'in_progress')} className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${item.status === 'in_progress' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-gray-600'}`}>
                <Clock className="w-3 h-3" /> Pending
              </button>
              <button onClick={() => updateLeadStatus(item.id, 'spam')} className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${item.status === 'spam' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-gray-600'}`}>
                <Ban className="w-3 h-3" /> Spam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={pageRef} className="apex-portal min-h-screen w-full bg-slate-50 text-[#1E293B] font-sans p-3 sm:p-6 lg:p-8 relative pb-28 pt-[max(12px,env(safe-area-inset-top))]">
      
      <div className="no-print max-w-7xl mx-auto space-y-6">

        {/* 🟢 SOLID HEADER BAR WITH SAFE-AREA TOP CLEARANCE */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-4 relative">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center p-1.5">
                <img src="/logo.jpg" alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isHolidayMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className={`text-xs font-bold tracking-widest uppercase ${isHolidayMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isHolidayMode ? 'HOLIDAY PAUSE ACTIVE' : 'SYSTEM GUARDING'}
                  </span>

                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-500/30' : 'bg-amber-50 text-amber-600 border-amber-500/50'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {isOnline ? 'Live Sync' : 'Offline - Actions Queued'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Apex Mechanical</h1>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="sm:hidden p-2.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-2xl text-xs font-bold cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Settings className="w-3.5 h-3.5" /> Controls
            </button>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs font-sans">
            <button
              onClick={() => {
                const next = !isAudioMuted;
                setIsAudioMuted(next);
                if (next) toast.info('Chime Sound Effects Silenced');
                else toast.success('Chime Sound Effects Enabled');
              }}
              aria-label={isAudioMuted ? 'Unmute chime sounds' : 'Mute chime sounds'}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer bg-slate-50 border-slate-300 text-slate-700 flex items-center gap-1.5"
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isAudioMuted ? 'Muted' : 'Sound: ON'}
            </button>

            <button
              onClick={() => {
                const next = !isExecutiveFocus;
                setIsExecutiveFocus(next);
                if (next) toast.success('Focus Mode: ON');
                else toast.info('Focus Mode: OFF');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                isExecutiveFocus
                  ? 'bg-amber-50 border-amber-500 text-amber-700'
                  : 'bg-slate-50 border-slate-300 text-slate-500'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              {isExecutiveFocus ? 'Focus: ON' : 'Focus: OFF'}
            </button>

            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-300">
              <button onClick={() => handleRoleChange('owner')} className={`px-2.5 py-1 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-1 ${currentRole === 'owner' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Crown className="w-3.5 h-3.5" /> Owner</button>
              <button onClick={() => handleRoleChange('manager')} className={`px-2.5 py-1 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-1 ${currentRole === 'manager' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><ClipboardList className="w-3.5 h-3.5" /> Office</button>
              <button onClick={() => handleRoleChange('tech')} className={`px-2.5 py-1 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-1 ${currentRole === 'tech' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Wrench className="w-3.5 h-3.5" /> Tech</button>
            </div>

            {currentRole !== 'tech' && (
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-300">
                <button onClick={() => setActiveTab('command')} className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'command' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                  <Zap className="w-3.5 h-3.5" /> <span>Command</span>
                  {pendingActionCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full text-xs font-mono tabular-nums">
                      {pendingActionCount}
                    </span>
                  )}
                </button>
                {currentRole === 'owner' && (
                  <button onClick={() => setActiveTab('telemetry')} className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'telemetry' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><BarChart3 className="w-3.5 h-3.5" /> Performance</button>
                )}
                <button onClick={() => setActiveTab('toolkit')} className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'toolkit' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Wrench className="w-3.5 h-3.5" /> Toolkit</button>
              </div>
            )}
          </div>
        </header>

        {/* 🎯 DAILY BRIEFING + WORKLOAD SUMMARY (merged: was 3 stacked cards) */}
        <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-sans text-slate-700">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="shrink-0 mt-0.5">{trafficLightCounts.red === 0 ? <PartyPopper className="w-4 h-4 text-emerald-600" /> : <MessageCircle className="w-4 h-4 text-indigo-600" />}</span>
            {isFeedLoading ? (
              <div className="space-y-1.5 py-0.5">
                <SkeletonBar className="h-3 w-64" />
                <SkeletonBar className="h-3 w-48" />
              </div>
            ) : (
              <p className="leading-snug">
                <strong className="text-slate-800 font-bold">Good morning, Mark.</strong>{' '}
                {trafficLightCounts.red === 0
                  ? 'All clear — 0 urgent items awaiting callback. '
                  : 'System is guarding your line. '}
                <span className="text-indigo-600 font-semibold font-mono tabular-nums">{filteredFeed.length}</span> active leads today (<span className="font-mono tabular-nums">${missedRevenueAtRisk.toLocaleString()}</span> at risk) • <span className="text-emerald-600 font-bold font-mono tabular-nums">${totalClosedRevenue.toLocaleString()} won</span> (<span className="font-mono tabular-nums">{netRoiRatio}x</span> ROI)
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFeedLoading ? (
              <>
                <SkeletonBar className="h-7 w-28 rounded-xl" />
                <SkeletonBar className="h-7 w-24 rounded-xl" />
                <SkeletonBar className="h-7 w-20 rounded-xl" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-500/40 px-2.5 py-1 rounded-xl text-rose-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span><span className="font-mono tabular-nums">{trafficLightCounts.red}</span> Needs Action</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-500/40 px-2.5 py-1 rounded-xl text-amber-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span><span className="font-mono tabular-nums">{trafficLightCounts.yellow}</span> Dispatched</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span><span className="font-mono tabular-nums">{trafficLightCounts.green}</span> Won</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 📈 KPI BENTO GRID */}
        {currentRole === 'owner' && (
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-emerald-500/30 hover:border-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => { setActiveFilter(activeFilter === 'high_value' ? 'all' : 'high_value'); toast.info('Filtered feed by High-Value Opportunities'); }}
                className="gsap-card col-span-2 lg:col-span-1 flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-all duration-200 ease-in-out group"
              >
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-600 transition-all duration-1000 ease-out" strokeDasharray={`${revenueGoalPercent}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-mono tabular-nums font-black text-emerald-600">
                    {isFeedLoading ? <SkeletonBar className="h-3 w-6" /> : `${revenueGoalPercent}%`}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium font-sans text-slate-600 uppercase tracking-wider group-hover:text-emerald-600">
                      Closed Revenue Goal
                    </span>
                    {isEditingGoal ? (
                      <input
                        type="number"
                        autoFocus
                        defaultValue={monthlyGoal}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          const val = Number(e.target.value) || monthlyGoal;
                          setMonthlyGoal(val);
                          saveKpis({ goal: val });
                          setIsEditingGoal(false);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-16 bg-slate-50 border border-emerald-500/40 rounded px-1 text-emerald-600 text-xs font-mono tabular-nums"
                      />
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsEditingGoal(true); }}
                        className="text-xs text-slate-600 hover:text-emerald-600 underline shrink-0"
                      >
                        (${monthlyGoal.toLocaleString()} — edit)
                      </button>
                    )}
                  </div>
                  {isFeedLoading ? (
                    <SkeletonBar className="h-8 w-28 mt-1" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums tracking-tight">${totalClosedRevenue.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="gsap-card hidden sm:flex flex-col justify-center p-3 rounded-xl border border-slate-200 bg-slate-100 font-sans">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Monthly Retainer</span>
                {isEditingRetainer ? (
                  <input
                    type="number"
                    autoFocus
                    defaultValue={monthlyRetainer}
                    onBlur={(e) => {
                      const val = Number(e.target.value) || monthlyRetainer;
                      setMonthlyRetainer(val);
                      saveKpis({ retainer: val });
                      setIsEditingRetainer(false);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-20 bg-slate-50 border border-slate-300 rounded px-1 text-slate-800 text-sm font-mono tabular-nums"
                  />
                ) : (
                  <button onClick={() => setIsEditingRetainer(true)} className="text-xl font-bold text-slate-800 font-mono tabular-nums hover:text-indigo-600 cursor-pointer text-left">
                    ${monthlyRetainer}/mo
                  </button>
                )}
              </div>

              <div className="gsap-card hidden lg:flex flex-col justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-100">
                <label htmlFor="avg-ticket-slider" className="text-xs font-medium font-sans text-slate-600 uppercase tracking-wider shrink-0">Avg Ticket: <span className="text-emerald-600 font-mono tabular-nums">${avgJobTicket}</span></label>
                <input id="avg-ticket-slider" type="range" min="150" max="2500" step="50" value={avgJobTicket} onChange={(e) => setAvgJobTicket(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>

              <div
                onClick={() => { setActiveFilter('all'); toast.info('Reset Feed Filters'); }}
                className="gsap-card flex flex-col justify-center p-3 rounded-xl border border-emerald-500/30 bg-slate-100 text-center cursor-pointer hover:bg-slate-200 transition-all duration-200 ease-in-out"
              >
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wider block font-sans">Net ROI Return</span>
                {isFeedLoading ? (
                  <SkeletonBar className="h-6 w-20 mx-auto" />
                ) : (
                  <span className="text-xl font-black text-emerald-600 font-mono tabular-nums">{netRoiRatio}x ROI</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 justify-end border-t border-slate-200 pt-4">
              <button
                onClick={handleTriggerEodSmsPush}
                className="px-3 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-700 font-sans text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 min-h-[44px] sm:min-h-0"
              >
                <Smartphone className="w-3.5 h-3.5" /> EOD SMS Push
              </button>

              <button onClick={() => window.print()} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-bold rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEWPORT 1: COMMAND CENTER ================= */}
        {activeTab === 'command' && currentRole !== 'tech' && (
          <div className="space-y-5">
            
            {missedRevenueAtRisk > 0 && actionItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-600 uppercase block font-sans"><span className="font-mono tabular-nums">{actionItems.length}</span> Urgent Item(s) Need Action</span>
                      <span className="text-xs bg-rose-50 text-rose-700 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold font-sans inline-flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> <span className="font-mono tabular-nums">${missedRevenueAtRisk.toLocaleString()}</span> Revenue at Risk
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-sans">{actionItems[0].subtitle}</span>
                  </div>
                </div>
                <button onClick={() => { setActionItems((prev) => prev.slice(1)); toast.success('Action Item Resolved'); }} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 shrink-0 cursor-pointer font-sans min-h-[44px] sm:min-h-0 flex items-center">
                  {actionItems[0].actionText}
                </button>
              </div>
            )}

            <div className={`grid grid-cols-1 ${isExecutiveFocus ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-5 transition-all`}>
              
              {!isExecutiveFocus && (
                <aside className="lg:col-span-1 space-y-4 font-sans">
                  <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-4 space-y-3">
                    
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                      <button onClick={() => setQuickToolTab('review')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${quickToolTab === 'review' ? 'bg-indigo-600 text-white ' : 'text-slate-600'}`}>
                        <Star className="w-3.5 h-3.5" /> <span>Review</span>
                      </button>
                      <button onClick={() => setQuickToolTab('pay')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${quickToolTab === 'pay' ? 'bg-emerald-600 text-white ' : 'text-slate-600'}`}>
                        <CreditCard className="w-3.5 h-3.5" /> <span>Pay</span>
                      </button>
                      <button onClick={() => setQuickToolTab('social')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${quickToolTab === 'social' ? 'bg-blue-600 text-white ' : 'text-slate-600'}`}>
                        <Camera className="w-3.5 h-3.5" /> <span>Social</span>
                      </button>
                    </div>

                    {quickToolTab === 'review' && (
                      <form onSubmit={(e) => { e.preventDefault(); if (!reviewPhone) return; toast.success(`Review SMS sent to ${reviewPhone}`); setReviewPhone(''); }} className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>Send Review Request SMS</span>
                          <button type="button" onClick={() => setIsEditingTemplates(true)} className="text-indigo-600 hover:underline">Edit Script</button>
                        </div>
                        <input type="tel" value={reviewPhone} onChange={(e) => setReviewPhone(e.target.value)} placeholder="Customer Phone (555-000-0000)" aria-label="Customer phone number for review request" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 font-mono tabular-nums min-h-[44px] sm:min-h-0" />
                        <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center">Send Review Request</button>
                      </form>
                    )}

                    {quickToolTab === 'pay' && (
                      <form onSubmit={(e) => { e.preventDefault(); if (!payPhone || !payAmount) return; toast.success(`Payment link for $${payAmount} sent to ${payPhone}`); setPayPhone(''); setPayAmount(''); }} className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>Send Text-to-Pay Invoice</span>
                          <button type="button" onClick={() => setIsEditingTemplates(true)} className="text-indigo-600 hover:underline">Edit Script</button>
                        </div>
                        
                        <input type="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="Customer Phone" aria-label="Customer phone number for pay request" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 font-mono tabular-nums min-h-[44px] sm:min-h-0" />

                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-600 uppercase font-bold shrink-0">Quick:</span>
                          <button type="button" onClick={() => setPayAmount('79')} className="px-2 py-1 bg-slate-50 hover:bg-emerald-500/20 text-emerald-600 border border-slate-200 rounded-lg transition-all min-h-[44px] sm:min-h-0 flex items-center">$79</button>
                          <button type="button" onClick={() => setPayAmount('150')} className="px-2 py-1 bg-slate-50 hover:bg-emerald-500/20 text-emerald-600 border border-slate-200 rounded-lg transition-all min-h-[44px] sm:min-h-0 flex items-center">$150</button>
                          <button type="button" onClick={() => setPayAmount('450')} className="px-2 py-1 bg-slate-50 hover:bg-emerald-500/20 text-emerald-600 border border-slate-200 rounded-lg transition-all min-h-[44px] sm:min-h-0 flex items-center">$450</button>
                          <button type="button" onClick={() => setPayAmount('1800')} className="px-2 py-1 bg-slate-50 hover:bg-emerald-500/20 text-emerald-600 border border-slate-200 rounded-lg transition-all min-h-[44px] sm:min-h-0 flex items-center">$1.8k</button>
                        </div>

                        <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="$ Invoice Amount" aria-label="Invoice amount" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-emerald-500 font-mono tabular-nums min-h-[44px] sm:min-h-0" />
                        
                        <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center">Send Payment Link</button>
                      </form>
                    )}

                    {quickToolTab === 'social' && (
                      <form onSubmit={handlePublishSocialProof} className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>Publish Review / Photo to FB & GMB</span>
                          <span className="text-blue-600 font-bold font-mono tabular-nums">Make.com</span>
                        </div>
                        <textarea 
                          rows={2}
                          value={socialCaption} 
                          onChange={(e) => setSocialCaption(e.target.value)} 
                          placeholder="Add caption or job details..." 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-blue-500 text-xs font-sans" 
                        />
                        <button 
                          type="submit" 
                          disabled={isFiringWebhook}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0"
                        >
                          <Zap className="w-3.5 h-3.5" /> {isFiringWebhook ? 'Dispatching Webhook...' : 'Fire Webhook to Post FB/IG/GMB'}
                        </button>
                      </form>
                    )}

                  </div>

                  <div className="bg-purple-50 border border-purple-500/30 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> Database Reactivation</span>
                      <span className="text-xs bg-purple-500/20 text-purple-600 px-2 py-0.5 rounded-full">LTV Booster</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">Launch an automated SMS drip to past customer list on slow days.</p>
                    <button onClick={() => setIsCampaignLauncherOpen(true)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center">
                      Launch SMS Blast Campaign
                    </button>
                  </div>

                  <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 rounded-2xl p-4 text-xs space-y-1.5">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Peak Call Times (24h)</span>
                    <div className="flex items-end gap-1 h-12 pt-1 border-b border-slate-200">
                      {peakCallHours.map((count, hr) => (
                        <div key={hr} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500 rounded-t transition-all relative group" style={{ height: `${Math.max(15, count * 40)}%` }}>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs bg-black text-slate-800 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {hr}:00 ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 font-mono tabular-nums">
                      <span>12 AM</span>
                      <span>12 PM</span>
                      <span>11 PM</span>
                    </div>
                  </div>
                </aside>
              )}

              <main className={`${isExecutiveFocus ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-4 sm:p-5 space-y-3 font-sans`}>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    
                    <div className="relative w-full sm:w-44 flex items-center">
                      <Search aria-hidden="true" className="absolute left-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        aria-label="Search leads by name, phone, title, or job category"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-slate-800 placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 text-xs min-h-[44px] sm:min-h-0"
                      />
                      <button
                        onClick={handleVoiceSearch}
                        className={`absolute right-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                          isVoiceSearching ? 'text-rose-600 animate-pulse scale-110' : 'text-slate-600 hover:text-slate-800'
                        }`}
                        title="Search by Voice Dictation"
                        aria-label="Search by voice dictation"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-2 py-1 rounded-lg font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        <List className="w-3.5 h-3.5" /> Feed
                      </button>
                      <button
                        onClick={() => setViewMode('board')}
                        className={`px-2 py-1 rounded-lg font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${viewMode === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Board
                      </button>
                      <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-2 py-1 rounded-lg font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        <CalendarClock className="w-3.5 h-3.5" /> Schedule
                      </button>
                    </div>

                    <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => setLayoutDensity('comfortable')}
                        className={`px-2 py-1 rounded-lg font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${layoutDensity === 'comfortable' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Cozy
                      </button>
                      <button
                        onClick={() => setLayoutDensity('compact')}
                        className={`px-2 py-1 rounded-lg font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${layoutDensity === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        <Minimize2 className="w-3.5 h-3.5" /> Dense
                      </button>
                    </div>

                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                      <button 
                        onClick={() => setSelectedTechFilter(null)}
                        className={`text-xs px-2 py-1 rounded-lg border font-sans min-h-[44px] sm:min-h-0 flex items-center ${!selectedTechFilter ? 'bg-slate-100 border-slate-300 text-slate-800' : 'text-slate-600 border-transparent'}`}
                      >
                        All Techs
                      </button>
                      {techLeaderboard.map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => setSelectedTechFilter(selectedTechFilter === tech.id ? null : tech.id)}
                          className={`text-xs p-1.5 rounded-lg border transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center ${selectedTechFilter === tech.id ? 'bg-purple-600/40 border-purple-400 scale-110' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                          title={`Filter by ${tech.name}`}
                        >
                          {tech.avatar}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pt-1 sm:pt-0">
                    <button onClick={() => setActiveFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[44px] sm:min-h-0 ${activeFilter === 'all' ? 'bg-indigo-600 text-white ' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      <span>All (<span className="font-mono tabular-nums">{filterCounts.all}</span>)</span>
                    </button>
                    <button onClick={() => setActiveFilter('unreplied')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${activeFilter === 'unreplied' ? 'bg-amber-600 text-white ' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      <AlertTriangle className="w-3.5 h-3.5" /> <span>Overdue (<span className="font-mono tabular-nums">{filterCounts.unreplied}</span>)</span>
                    </button>
                    <button onClick={() => setActiveFilter('emergency')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${activeFilter === 'emergency' ? 'bg-rose-600 text-white ' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      <Siren className="w-3.5 h-3.5" /> <span>Emergency</span>
                    </button>
                    <button onClick={() => setActiveFilter('high_value')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center gap-1 ${activeFilter === 'high_value' ? 'bg-emerald-600 text-white ' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      <DollarSign className="w-3.5 h-3.5" /> <span>High Value</span>
                    </button>
                  </div>
                </div>

                {/* LIST FEED VIEW */}
                {viewMode === 'list' && (
                  <div className="space-y-4 text-xs">
                    {isFeedLoading ? (
                      <div className="space-y-2">
                        <LeadCardSkeleton />
                        <LeadCardSkeleton />
                        <LeadCardSkeleton />
                      </div>
                    ) : filteredFeed.length > 0 ? (
                      <>
                        {todayLeads.length > 0 && (
                          <div className="space-y-2">
                            <div className="sticky top-0 bg-slate-50 border-b border-indigo-500/30 py-1.5 px-2 backdrop-blur-md z-10 flex justify-between items-center text-xs text-indigo-600 font-bold uppercase tracking-wider font-sans">
                              <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Today (<span className="font-mono tabular-nums">{todayLeads.length}</span> Action Item Jobs)</span>
                              <span className="text-slate-600 text-xs">Use J/K keys to traverse</span>
                            </div>
                            {todayLeads.map((item, index) => renderLeadCard(item, index))}
                          </div>
                        )}

                        {earlierLeads.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 py-1.5 px-2 backdrop-blur-md z-10 flex justify-between items-center text-xs text-slate-600 font-bold uppercase tracking-wider font-sans">
                              <span className="inline-flex items-center gap-1"><Hourglass className="w-3.5 h-3.5" /> Yesterday & Earlier (<span className="font-mono tabular-nums">{earlierLeads.length}</span> Action Item Jobs)</span>
                            </div>
                            {earlierLeads.map((item, index) => renderLeadCard(item, todayLeads.length + index))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-600 space-y-3 font-sans">
                        <Inbox className="w-8 h-8 mx-auto text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-800">No pending action leads matching your filter</h4>
                        <p className="text-xs text-slate-600 max-w-sm mx-auto">Focus Mode is hiding completed/won jobs. Toggle Focus OFF in top bar to view full historical archive.</p>

                        <div className="pt-2 flex flex-wrap justify-center gap-2 font-sans">
                          <button
                            onClick={handleSendSelfTestLead}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center gap-1.5"
                          >
                            <FlaskConical className="w-3.5 h-3.5" /> Send Test Lead to Myself
                          </button>
                          <button
                            onClick={handleToggleDemoMode}
                            className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-700 border border-purple-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center gap-1.5"
                          >
                            <Drama className="w-3.5 h-3.5" /> Load Pitch Demo Data
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BOARD KANBAN VIEW */}
                {viewMode === 'board' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs text-amber-600 uppercase font-bold">
                        <span className="inline-flex items-center gap-1"><Inbox className="w-3.5 h-3.5" /> Incoming (<span className="font-mono tabular-nums">{activityFeed.filter((i) => i.status === 'pending').length}</span>)</span>
                      </div>
                      {activityFeed.filter((i) => i.status === 'pending').map((item) => (
                        <div key={item.id} className="p-2.5 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-amber-500/30 rounded-lg space-y-1 text-xs">
                          <div className="font-bold text-slate-800">{item.customerName}</div>
                          <div className="text-xs text-slate-600 font-mono tabular-nums">{item.phone} • ${item.estimatedValue}</div>
                          <button onClick={() => updateLeadStatus(item.id, 'won')} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded font-sans mt-1 min-h-[44px] sm:min-h-0 flex items-center justify-center">Mark Won</button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs text-indigo-600 uppercase font-bold">
                        <span className="inline-flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Dispatched (<span className="font-mono tabular-nums">{activityFeed.filter((i) => i.status === 'in_progress').length}</span>)</span>
                      </div>
                      {activityFeed.filter((i) => i.status === 'in_progress').map((item) => (
                        <div key={item.id} className="p-2.5 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-indigo-500/30 rounded-lg space-y-1 text-xs">
                          <div className="font-bold text-slate-800">{item.customerName}</div>
                          <div className="text-xs text-slate-600 font-sans">{item.jobCategory}</div>
                          <button onClick={() => updateLeadStatus(item.id, 'won')} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded font-sans mt-1 min-h-[44px] sm:min-h-0 flex items-center justify-center">Mark Won</button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs text-emerald-600 uppercase font-bold">
                        <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed & Won (<span className="font-mono tabular-nums">{activityFeed.filter((i) => i.status === 'won').length}</span>)</span>
                      </div>
                      {activityFeed.filter((i) => i.status === 'won').map((item) => (
                        <div key={item.id} className="p-2.5 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-emerald-500/30 rounded-lg space-y-1 text-xs">
                          <div className="font-bold text-slate-800">{item.customerName}</div>
                          <div className="text-xs text-emerald-600 font-mono tabular-nums font-bold">+${item.closedValue || item.estimatedValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CALENDAR / SCHEDULE VIEW */}
                {viewMode === 'calendar' && (
                  <div className="space-y-4 font-sans">
                    {scheduledAgenda.length > 0 ? (
                      scheduledAgenda.map((group) => (
                        <div key={group.key} className="space-y-2">
                          <div className="sticky top-0 bg-slate-50 border-b border-indigo-500/30 py-1.5 px-2 backdrop-blur-md z-10 text-xs font-mono tabular-nums text-indigo-600 font-bold uppercase tracking-wider">
                            {group.label}
                          </div>
                          <div className="space-y-2">
                            {group.items.map((item) => {
                              const tech = techLeaderboard.find((t) => t.id === item.assignedTechId);
                              const time = new Date(item.scheduledAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                              return (
                                <div key={item.id} className="p-3 bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 rounded-xl flex items-center gap-3 text-xs">
                                  <div className="w-16 shrink-0 text-center">
                                    <span className="text-sm font-black text-indigo-600 font-mono tabular-nums block">{time}</span>
                                  </div>
                                  <div className="w-px h-10 bg-slate-100 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-800 truncate">{item.customerName}</span>
                                      <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">{item.jobCategory}</span>
                                    </div>
                                    <span className="text-xs text-slate-600 truncate block">{item.address || item.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {tech && <span className="text-lg" title={tech.name}>{tech.avatar}</span>}
                                    <a href={`tel:${item.phone}`} onClick={() => playSynthesizerChime('click')} className="p-2 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-700 hover:text-white rounded-lg transition-all">
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                    <button onClick={() => { playSynthesizerChime('click'); setActiveChatLead(item); }} className="p-2 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-700 hover:text-white rounded-lg cursor-pointer transition-all">
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-600 space-y-2">
                        <CalendarClock className="w-8 h-8 mx-auto text-slate-500" />
                        <h4 className="text-sm font-bold text-slate-800">No scheduled dispatches yet</h4>
                        <p className="text-xs text-slate-600 max-w-sm mx-auto">Use the Dispatch button on a lead to pick a date &amp; time — it&apos;ll show up here.</p>
                      </div>
                    )}
                  </div>
                )}

              </main>

            </div>
          </div>
        )}

        {/* ================= VIEWPORT 2: PERFORMANCE METRICS ================= */}
        {activeTab === 'telemetry' && currentRole === 'owner' && (
          <div className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl">
                <span className="text-xs text-slate-600 font-bold uppercase flex items-center gap-1.5">
                  Google Search Rank
                  {seoSnapshot?.estimationMode && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-500/30 px-1.5 py-0.5 rounded-full normal-case font-bold">Estimated</span>}
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block font-mono tabular-nums">
                  {seoSnapshot ? (typeof seoSnapshot.rank === 'number' ? `Pos. #${seoSnapshot.rank}` : seoSnapshot.rank) : '—'}
                </span>
                <span className="text-xs text-slate-600 font-sans mt-1 block truncate" title={seoSnapshot?.keyword}>
                  for &ldquo;{seoSnapshot?.keyword || '—'}&rdquo;
                </span>
              </div>
              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl">
                <span className="text-xs text-slate-600 font-bold uppercase block">Speed-to-Lead (Avg)</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono tabular-nums">
                  {avgSpeedToLeadSeconds === null ? '—' : avgSpeedToLeadSeconds < 60 ? `${avgSpeedToLeadSeconds}s` : `${Math.round(avgSpeedToLeadSeconds / 60)}m`}
                </span>
                <span className="text-xs text-slate-600 font-sans mt-1 block">Time from lead capture to first auto-reply</span>
              </div>
              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl">
                <span className="text-xs text-slate-600 font-bold uppercase block">Weekly SMS Digest</span>
                <button onClick={() => { setWeeklyDigestSms(!weeklyDigestSms); toast.info(weeklyDigestSms ? 'Digest Disabled' : 'Friday 5 PM Digest Enabled'); }} className={`mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] sm:min-h-0 flex items-center gap-1.5 ${weeklyDigestSms ? 'bg-emerald-50 text-emerald-600 border-emerald-500/50' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <Smartphone className="w-3.5 h-3.5" /> {weeklyDigestSms ? 'Digest: ON (Friday 5 PM)' : 'Digest: OFF'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Revenue Trend (Last 14 Days)</h3>
                <div className="flex items-end gap-1.5 h-28 pt-2 border-b border-slate-200">
                  {revenueTrendByDay.map((day, idx) => {
                    const max = Math.max(...revenueTrendByDay.map((d) => d.won), 1);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <span className="absolute -top-5 text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity font-mono tabular-nums whitespace-nowrap">${day.won.toLocaleString()}</span>
                        <div className="w-full bg-emerald-500/30 hover:bg-emerald-500 rounded-t transition-all" style={{ height: `${Math.max(4, (day.won / max) * 100)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-mono tabular-nums">
                  <span>{revenueTrendByDay[0]?.label}</span>
                  <span>{revenueTrendByDay[revenueTrendByDay.length - 1]?.label}</span>
                </div>
              </div>

              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Revenue by Channel</h3>
                <div className="grid grid-cols-1 gap-2 font-sans">
                  {(Object.entries(channelBreakdown) as [LeadSource, { count: number; won: number; revenue: number }][]).map(([source, stats]) => {
                    const closeRate = stats.count > 0 ? Math.round((stats.won / stats.count) * 100) : 0;
                    const labels: Record<LeadSource, string> = { google_maps: 'Google Maps', google_lsa: 'Google LSA', organic_web: 'Web Organic', truck_wrap: 'Direct / Wrap' };
                    return (
                      <div key={source} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-slate-800 block">{labels[source]}</span>
                          <span className="text-xs text-slate-600 font-mono tabular-nums">{stats.count} leads • {closeRate}% close rate</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600 font-mono tabular-nums">${stats.revenue.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Website Performance</h3>
                {seoSnapshot ? (
                  <div className="flex items-center gap-4">
                    <div>
                      <span className={`text-2xl font-black font-mono tabular-nums block ${seoSnapshot.speedStatus === 'pass' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {seoSnapshot.speedScore ?? '—'}<span className="text-xs text-slate-600">/100</span>
                      </span>
                      <span className="text-xs text-slate-600 font-mono tabular-nums">Load: {seoSnapshot.lcp ?? '—'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${seoSnapshot.isRealSpeedData ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/30' : 'bg-amber-50 text-amber-600 border border-amber-500/30'}`}>
                      {seoSnapshot.isRealSpeedData ? 'Live Google Data' : 'Estimated'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">Loading...</span>
                )}
                <p className="text-xs text-slate-600 font-mono tabular-nums truncate">{seoSnapshot?.domain}</p>
              </div>

              <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Who&apos;s Outranking You</h3>
                {seoSnapshot && seoSnapshot.competitors.length > 0 ? (
                  <div className="space-y-1.5">
                    {seoSnapshot.competitors.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <span className="text-slate-800 font-bold truncate">{comp.name}</span>
                        <span className="text-slate-600 font-mono tabular-nums flex items-center gap-1 shrink-0"><Star className="w-3 h-3 text-amber-600" /> {comp.rating} ({comp.reviews})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">No competitor data yet</span>
                )}
              </div>
            </div>

            <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Integration Health Matrix</h3>
                <button onClick={() => setIsWebhookModalOpen(true)} className="text-xs text-blue-600 hover:underline">Configure Webhooks</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                {integrations.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.name}</span>
                      <span className="text-xs text-slate-600 font-mono tabular-nums">{item.latency || item.credit || item.lastSync || item.message}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${item.status === 'connected' ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/30' : 'bg-rose-50 text-rose-600 border border-rose-500/30'}`}>
                      {item.status === 'connected' ? <><CheckCircle2 className="w-3 h-3" /> Connected</> : <><AlertTriangle className="w-3 h-3" /> Attention</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEWPORT 3: TOOLKIT ================= */}
        {activeTab === 'toolkit' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Tech Review Leaderboard</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                {techLeaderboard.map((tech) => (
                  <div key={tech.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tech.avatar}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{tech.name}</h4>
                        <span className="text-xs text-slate-600 font-mono tabular-nums">Rank #{tech.monthlyRank} • {tech.phone}</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-amber-600 font-mono tabular-nums">{tech.reviewsCollected} Revs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gsap-card bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border border-slate-200 hover:border-slate-300 transition-all duration-200 p-5 rounded-2xl print: space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Field Tech Review Pass</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200 max-w-md mx-auto text-center sm:text-left print:">
                <div className="w-24 h-24 shrink-0 bg-white p-2.5 rounded-xl border border-slate-200 transition- print:">
                  <QRCode size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} value="https://google.com" viewBox="0 0 256 256" />
                </div>
                <div className="space-y-1.5 font-sans">
                  <h4 className="text-xs font-bold text-slate-800">Google Review Pass</h4>
                  <p className="text-xs text-slate-600">Scan to leave a review</p>
                  <button onClick={() => window.print()} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all active:scale-95 min-h-[44px] sm:min-h-0 flex items-center">
                    Print Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 📱 CONSOLIDATED DYNAMIC BOTTOM DOCK */}
      <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 bg-slate-50/95 border-t border-slate-200 p-2.5 backdrop-blur-2xl z-40 flex items-center justify-around font-sans text-xs pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        {selectedLeadIds.length > 0 ? (
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-indigo-600 font-mono tabular-nums font-bold">{selectedLeadIds.length} Selected</span>
            <div className="flex items-center gap-2">
              <button onClick={handleBatchWon} className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">Mark Won</button>
              <button onClick={handleBatchSnooze} className="px-3 py-1.5 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs">Snooze</button>
              <button onClick={() => setSelectedLeadIds([])} aria-label="Clear selection" className="min-h-[44px] min-w-[44px] text-slate-600 p-1 font-bold flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : mobileFocusedLead ? (
          <div className="flex items-center justify-between w-full px-2">
            <div className="text-xs truncate max-w-[120px]">
              <span className="font-bold text-slate-800 block truncate">{mobileFocusedLead.customerName}</span>
              <span className="text-emerald-600 font-mono tabular-nums font-bold text-xs">${mobileFocusedLead.estimatedValue}</span>
            </div>
            <div className="flex items-center gap-1.5 font-sans">
              <button onClick={() => setDispatchTargetLead(mobileFocusedLead)} className="px-2.5 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl">Dispatch</button>
              <a href={`tel:${mobileFocusedLead.phone}`} className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Call</a>
              <button onClick={() => setActiveChatLead(mobileFocusedLead)} className="px-2.5 py-1.5 bg-indigo-600/40 text-indigo-700 border border-indigo-500/40 text-xs font-bold rounded-xl">Chat</button>
              <button onClick={() => setMobileFocusedLead(null)} aria-label="Close lead details" className="min-h-[44px] min-w-[44px] text-slate-600 p-1 font-bold flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-around w-full">
            <button onClick={() => { setActiveTab('command'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center min-h-[40px] justify-center ${activeTab === 'command' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
              <Zap className="w-4 h-4" />
              <span className="text-xs">Command</span>
            </button>
            <button onClick={() => setIsEditingTemplates(true)} className="flex flex-col items-center text-slate-600 hover:text-slate-800 min-h-[40px] justify-center">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">Scripts</span>
            </button>
            <button onClick={() => setIsSupportOpen(true)} className="flex flex-col items-center text-indigo-600 font-bold min-h-[40px] justify-center">
              <Headphones className="w-4 h-4" />
              <span className="text-xs">Support</span>
            </button>
          </div>
        )}
      </div>

      {/* iOS MOBILE QUICK CONTROLS DRAWER */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-4 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-1" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase font-sans flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Portal Settings & Quick Controls</h3>
              <button onClick={() => setIsSettingsOpen(false)} aria-label="Close settings" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className="py-3 px-3 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl text-left text-xs active:scale-95 min-h-[44px] flex items-center justify-between"
              >
                <span>Chime Sounds</span>
                <span className="text-emerald-600 inline-flex items-center gap-1">{isAudioMuted ? <><VolumeX className="w-3.5 h-3.5" /> Silenced</> : <><Volume2 className="w-3.5 h-3.5" /> Active</>}</span>
              </button>

              <button
                onClick={() => setIsExecutiveFocus(!isExecutiveFocus)}
                className="py-3 px-3 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl text-left text-xs active:scale-95 min-h-[44px] flex items-center justify-between"
              >
                <span>Executive Focus</span>
                <span className="text-amber-600 inline-flex items-center gap-1">{isExecutiveFocus ? <><Target className="w-3.5 h-3.5" /> ON</> : <><Globe className="w-3.5 h-3.5" /> OFF</>}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-600 uppercase font-bold block">User View Role:</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
                <button onClick={() => { handleRoleChange('owner'); setIsSettingsOpen(false); }} className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 ${currentRole === 'owner' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Crown className="w-3.5 h-3.5" /> Owner</button>
                <button onClick={() => { handleRoleChange('manager'); setIsSettingsOpen(false); }} className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 ${currentRole === 'manager' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><ClipboardList className="w-3.5 h-3.5" /> Office</button>
                <button onClick={() => { handleRoleChange('tech'); setIsSettingsOpen(false); }} className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 ${currentRole === 'tech' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}><Wrench className="w-3.5 h-3.5" /> Tech</button>
              </div>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => { handleToggleDemoMode(); setIsSettingsOpen(false); }}
                className="w-full py-3 px-3 bg-purple-50 border border-purple-500/30 text-purple-700 font-bold rounded-xl text-left text-xs flex justify-between items-center min-h-[44px]"
              >
                <span className="inline-flex items-center gap-1.5"><Drama className="w-3.5 h-3.5" /> Sales Pitch Demo Data</span>
                <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">{isDemoMode ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => { setIsSettingsOpen(false); setIsWebhookModalOpen(true); }}
                className="w-full py-3 px-3 bg-blue-50 border border-blue-500/30 text-blue-700 font-bold rounded-xl text-left text-xs flex justify-between items-center min-h-[44px]"
              >
                <span className="inline-flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Webhooks Automation Endpoint</span>
                <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">Configure</span>
              </button>

              <button
                onClick={() => { setIsSettingsOpen(false); router.push('/portal/settings/branding'); }}
                className="w-full py-3 px-3 bg-indigo-50 border border-indigo-500/30 text-indigo-700 font-bold rounded-xl text-left text-xs flex justify-between items-center min-h-[44px]"
              >
                <span className="inline-flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Branding Options</span>
                <span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded-full">Logo &amp; Color</span>
              </button>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-200 cursor-pointer font-sans active:scale-95 min-h-[44px] flex items-center justify-center">
              Close Controls
            </button>
          </div>
        </div>
      )}

      {/* 💬 LIVE SMS INBOX BOTTOM SHEET */}
      {activeChatLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 2-Way Live SMS Inbox</span>
                <h3 className="text-base font-bold text-slate-800 font-sans">{activeChatLead.customerName}</h3>
                <p className="text-xs text-slate-600">{activeChatLead.phone} • {activeChatLead.jobCategory}</p>
              </div>
              <button onClick={() => setActiveChatLead(null)} aria-label="Close chat" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div ref={chatScrollRef} className="space-y-2 max-h-60 overflow-y-auto pr-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-sans">
              {activeChatLead.chatThread && activeChatLead.chatThread.length > 0 ? (
                activeChatLead.chatThread.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-2.5 rounded-2xl max-w-[85%] text-xs ${
                      msg.sender === 'staff'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : msg.sender === 'system'
                        ? 'bg-slate-100 text-slate-500 rounded-bl-none'
                        : 'bg-emerald-50 border border-emerald-500/40 text-emerald-700 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                    </div>
                    <span className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-slate-600 font-mono tabular-nums">{msg.timestamp}</span>
                      {msg.sender === 'staff' && msg.status && (
                        <span title={msg.status} className="inline-flex items-center">
                          {msg.status === 'sending' && <Clock className="w-3 h-3 text-slate-400 animate-pulse" />}
                          {msg.status === 'sent' && <Check className="w-3 h-3 text-slate-400" />}
                          {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-slate-400" />}
                          {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-indigo-500" />}
                          {msg.status === 'failed' && (
                            <span className="inline-flex items-center gap-0.5 text-rose-500">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                ))
              ) : !isCustomerTyping ? (
                <div className="text-center text-slate-600 py-4 text-xs font-sans">No text messages recorded yet.</div>
              ) : null}

              {isCustomerTyping && (
                <div className="flex flex-col items-start">
                  <div className="p-2.5 rounded-2xl rounded-bl-none bg-emerald-50 border border-emerald-500/40 flex items-center gap-1" aria-label="Customer is typing">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1 font-sans">
              <span className="text-xs text-slate-600 font-bold uppercase inline-flex items-center gap-1"><Bot className="w-3 h-3" /> Smart Category Quick Reply Chips:</span>
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
                {contextualChatChips.map((chipText, idx) => (
                  <button 
                    key={idx}
                    type="button" 
                    onClick={() => setReplyMessageText(chipText)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-50 text-purple-700 border border-purple-500/40 rounded-full shrink-0 transition-all font-sans text-left min-h-[44px] sm:min-h-0 flex items-center"
                  >
                    {chipText}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendSmsReply} className="flex gap-2 pt-1">
              <input 
                type="text" 
                value={replyMessageText} 
                onChange={(e) => setReplyMessageText(e.target.value)} 
                placeholder="Type SMS reply to homeowner..." 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-sans text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 min-h-[44px] sm:min-h-0" 
              />
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer font-sans min-h-[44px] sm:min-h-0 flex items-center justify-center">
                Send SMS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📄 TECH DISPATCH BOTTOM SHEET */}
      {dispatchTargetLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-md w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Dispatch Job Packet To Field Tech</h3>
              <button onClick={() => setDispatchTargetLead(null)} aria-label="Close dispatch form" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleDispatchToTech} className="space-y-3 font-sans">
              <div>
                <label htmlFor="dispatch-tech-select" className="text-xs text-slate-600 uppercase font-bold block mb-1">Select Field Technician</label>
                <select
                  id="dispatch-tech-select"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-sans text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-purple-500 min-h-[44px] sm:min-h-0"
                >
                  {techLeaderboard.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.avatar} {tech.name} ({tech.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-600 uppercase font-bold block">Quick Schedule:</label>
                <div className="flex gap-1.5 text-xs">
                  {[
                    { label: '15 Mins', mins: 15 },
                    { label: '30 Mins', mins: 30 },
                    { label: '1 Hour', mins: 60 },
                    { label: '2 Hours', mins: 120 },
                  ].map(({ label, mins }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setDispatchQuickEta(label, mins)}
                      className={`flex-1 py-1.5 rounded-lg border font-bold transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1 ${
                        dispatchEta === label ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="dispatch-datetime" className="text-xs text-slate-600 uppercase font-bold block">Scheduled Date & Time</label>
                <input
                  id="dispatch-datetime"
                  type="datetime-local"
                  value={dispatchDateTime}
                  onChange={(e) => { setDispatchDateTime(e.target.value); setDispatchEta('Custom'); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-sans text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-purple-500 min-h-[44px] sm:min-h-0"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-purple-700">
                <span className="text-xs font-sans text-purple-600 uppercase font-bold block">Job Route Packet Summary:</span>
                <p><strong>Customer:</strong> {dispatchTargetLead.customerName} ({dispatchTargetLead.phone})</p>
                <p><strong>Address:</strong> {dispatchTargetLead.address || 'Address provided via caller ID'}</p>
                {dispatchTargetLead.aiSummary && (
                  <p><strong>AI Note:</strong> {dispatchTargetLead.aiSummary.issue} ({dispatchTargetLead.aiSummary.requestedTime})</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 cursor-pointer text-xs uppercase min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Print Work Order
                </button>
                <button type="submit" className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer text-xs uppercase tracking-wider min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> Send Job SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔗 WEBHOOK SETTINGS BOTTOM SHEET */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Make.com / Zapier Webhook Bridge</h3>
              <button onClick={() => setIsWebhookModalOpen(false)} aria-label="Close webhook settings" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-slate-500 font-sans text-xs leading-relaxed">Paste your Make.com or Zapier webhook trigger URL below. All social posts, campaign launches, and emergency alerts will stream to this endpoint.</p>

            <div className="space-y-2 font-sans">
              <label htmlFor="webhook-url" className="text-xs text-slate-600 uppercase font-bold block">Active Webhook Target URL</label>
              <input
                id="webhook-url"
                type="url"
                value={makeWebhookUrl}
                onChange={(e) => setMakeWebhookUrl(e.target.value)}
                placeholder="https://hook.us1.make.com/..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-blue-500 min-h-[44px] sm:min-h-0" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans pt-1">
              <button
                onClick={() => fireAutomationWebhook('PING_TEST', { testStatus: 'OK', pingedAt: new Date().toLocaleTimeString() })}
                disabled={isFiringWebhook}
                className="py-3 px-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-700 font-bold rounded-xl text-center text-xs cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5"
              >
                {isFiringWebhook ? 'Sending Ping...' : <><Zap className="w-3.5 h-3.5" /> Test Webhook Ping</>}
              </button>
              <button 
                onClick={() => { setIsWebhookModalOpen(false); toast.success('Webhook Endpoint Saved'); }}
                className="py-3 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-center text-xs cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 DATABASE CAMPAIGN LAUNCHER BOTTOM SHEET */}
      {isCampaignLauncherOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> Launch Database Reactivation Drip</h3>
              <button onClick={() => setIsCampaignLauncherOpen(false)} aria-label="Close campaign launcher" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleLaunchCampaign} className="space-y-3 font-sans">
              <div>
                <label htmlFor="campaign-offer" className="text-xs text-slate-600 uppercase font-sans font-bold block mb-1">Campaign Offer Headline</label>
                <input
                  id="campaign-offer"
                  type="text"
                  value={campaignOffer}
                  onChange={(e) => setCampaignOffer(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-purple-500 min-h-[44px] sm:min-h-0" 
                />
              </div>

              <div>
                <label htmlFor="campaign-target-count" className="text-xs text-slate-600 uppercase font-sans font-bold block mb-1">Target Customer Count</label>
                <input
                  id="campaign-target-count"
                  type="number"
                  value={campaignTargetCount}
                  onChange={(e) => setCampaignTargetCount(Number(e.target.value))} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono tabular-nums text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-purple-500 min-h-[44px] sm:min-h-0" 
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-500/30 rounded-xl text-xs text-purple-700 flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span><strong>Estimated Result:</strong> Sending to <span className="font-mono tabular-nums">{campaignTargetCount}</span> past clients will generate ~3–6 booked tune-up jobs (<span className="font-mono tabular-nums">$1,350+</span> revenue).</span>
              </div>

              <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer text-xs uppercase tracking-wider min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" /> Launch Automated Webhook Drip Now
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📇 CUSTOMER CRM PROFILE BOTTOM SHEET */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase block">Customer CRM Record</span>
                <h3 className="text-base font-bold text-slate-800 font-sans">{selectedCustomer.customerName}</h3>
                <p className="text-xs text-slate-600">{selectedCustomer.phone} • {selectedCustomer.address || 'No Address'}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} aria-label="Close customer details" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans">
              <button onClick={() => { setActiveChatLead(selectedCustomer); setSelectedCustomer(null); }} className="py-3 px-3 bg-purple-600/30 border border-purple-500/40 text-purple-700 font-bold rounded-xl text-center text-xs cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Open 2-Way Chat
              </button>
              <a href={`tel:${selectedCustomer.phone}`} className="py-3 px-3 bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 font-bold rounded-xl text-center text-xs cursor-pointer flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0">
                <Phone className="w-3.5 h-3.5" /> Call Phone
              </a>
            </div>

            <div className="space-y-1.5 pt-1 font-sans">
              <span className="text-xs text-slate-600 uppercase font-bold block">History Timeline:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedCustomer.history?.map((h, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-800 block">{h.event}</span>
                      <span className="text-xs text-slate-600 font-mono tabular-nums">{h.date}</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-sans">{h.statusBadge}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setSelectedCustomer(null)} className="w-full py-3 bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-200 cursor-pointer font-sans min-h-[44px] sm:min-h-0 flex items-center justify-center">
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* 💬 EDIT TEMPLATES BOTTOM SHEET */}
      {isEditingTemplates && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-lg w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Edit SMS Templates</h3>
              <button onClick={() => setIsEditingTemplates(false)} aria-label="Close template editor" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-1 font-sans">
              <label htmlFor="review-script" className="text-xs text-slate-600 uppercase font-bold block">Review Request Script</label>
              <textarea id="review-script" rows={3} value={reviewTemplate} onChange={(e) => setReviewTemplate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 text-xs" />
            </div>

            <div className="space-y-1 font-sans">
              <label htmlFor="pay-script" className="text-xs text-slate-600 uppercase font-bold block">Text-to-Pay Script</label>
              <textarea id="pay-script" rows={3} value={payTemplate} onChange={(e) => setPayTemplate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500 text-xs" />
            </div>

            <button onClick={() => { setIsEditingTemplates(false); toast.success('SMS Scripts Updated!'); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer font-sans min-h-[44px] sm:min-h-0 flex items-center justify-center">Save Templates</button>
          </div>
        </div>
      )}

      {/* 🎧 TECHNICAL SUPPORT BOTTOM SHEET */}
      {isSupportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/90 backdrop-blur-xl ring-1 ring-black/[0.04] border-t sm:border border-slate-200 rounded-t-[28px] sm:rounded-2xl max-w-md w-full p-5 space-y-3 font-sans text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" /> Direct Technical Support</h3>
              <button onClick={() => setIsSupportOpen(false)} aria-label="Close support" className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-800 font-bold p-2 cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-slate-500 font-sans text-xs leading-relaxed">Need an AI prompt adjustment or phone routing tweak? Our technical team patches requests within 2 hours.</p>

            <form onSubmit={(e) => { e.preventDefault(); if (!supportMessage) return; toast.success('Support Ticket Dispatched'); setSupportMessage(''); setIsSupportOpen(false); }} className="space-y-3 font-sans">
              <textarea 
                rows={3} 
                value={supportMessage} 
                onChange={(e) => setSupportMessage(e.target.value)} 
                placeholder="Describe request or AI prompt tweak..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus:border-indigo-500" 
              />
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center">
                Dispatch Support Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📄 PRINTABLE WORK ORDER */}
      <div className="hidden print:block w-full max-w-3xl mx-auto p-8 bg-white text-gray-900 font-sans leading-relaxed">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <span className="text-xs font-sans font-bold tracking-widest text-indigo-600 uppercase block">APEX MECHANICAL SERVICES // FIELD WORK ORDER TICKET</span>
            <h1 className="text-2xl font-black text-gray-900 mt-0.5">Customer Dispatch Ticket</h1>
          </div>
          <div className="text-right border-2 border-gray-900 px-4 py-2 rounded-xl bg-gray-50 font-sans">
            <span className="text-xs font-bold text-gray-500 uppercase block">Verified Job Status</span>
            <span className="text-xl font-black text-emerald-600">DISPATCHED</span>
          </div>
        </div>

        {dispatchTargetLead && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
              <div>
                <strong className="text-gray-500 uppercase text-xs block font-sans">Customer Details:</strong>
                <p className="font-bold text-base">{dispatchTargetLead.customerName}</p>
                <p className="font-mono tabular-nums">{dispatchTargetLead.phone}</p>
              </div>
              <div>
                <strong className="text-gray-500 uppercase text-xs block font-sans">Service Location:</strong>
                <p className="font-bold">{dispatchTargetLead.address}</p>
                <p className="text-indigo-600 font-bold">{dispatchTargetLead.jobCategory}</p>
              </div>
            </div>

            {dispatchTargetLead.aiSummary && (
              <div className="border p-4 rounded-xl space-y-1">
                <strong className="text-gray-500 uppercase text-xs block font-sans">AI Intercept Takeaways:</strong>
                <p><strong>Reported Issue:</strong> {dispatchTargetLead.aiSummary.issue}</p>
                <p><strong>Requested Arrival Slot:</strong> {dispatchTargetLead.aiSummary.requestedTime}</p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 mt-8 flex justify-center">
          <div className="flex items-center gap-4 border border-gray-200 rounded-xl px-5 py-4 print:">
            <div className="w-14 h-14 shrink-0">
              <QRCode size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} value={typeof window !== 'undefined' ? window.location.href : ''} viewBox="0 0 256 256" />
            </div>
            <p className="text-xs font-sans text-gray-500">White Pine Agency Control Portal<br />Printed On <span className="font-mono tabular-nums">{new Date().toLocaleDateString()}</span></p>
          </div>
        </div>
      </div>

    </div>
  );
}