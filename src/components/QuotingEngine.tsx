'use client';

import React, { useState, useEffect } from 'react';

interface ServiceOption {
  id: string;
  title: string;
  description: string;
  price: number;
  isCustom?: boolean;
  isWaivedBonus?: boolean;
}

const DEFAULT_SERVICES_LIST: ServiceOption[] = [
  // 🆓 INCLUDED FREE SOFTWARE BONUSES
  { id: 'clientPortal', title: 'Executive Portal & AI Operating OS', description: 'Full mobile client app, 2-way SMS inbox & ROI tracker', price: 0, isWaivedBonus: true },
  
  // 🟢 AGENCY MANAGEMENT & INTERCEPT SERVICES
  { id: 'speed', title: 'Speed-to-Lead Response', description: 'Automated 90-second client text back routing', price: 299 },
  { id: 'missedCall', title: 'Missed-Call Catch SMS', description: 'Instant SMS safety net recovery triggers', price: 199 },
  { id: 'aiReception', title: '24/7 Conversational AI', description: 'Interactive target intake receptionist agent', price: 499 },
  { id: 'socialProof', title: 'Local Social & Proof Publisher', description: 'Auto-formats 5-star Google reviews into graphics & syncs job photos to Meta/GMB', price: 199 },
  { id: 'ltvReactivation', title: 'Database LTV Reactivation', description: 'Automated seasonal SMS drips to past customer database', price: 350 },
  { id: 'textToPay', title: 'Text-to-Pay Gateway', description: 'Stripe Apple/Google Pay instant SMS invoices', price: 199 },
  { id: 'reviews', title: 'Review Booster Engine', description: 'Automated Google review loops & tech contest tracking', price: 250 },
  { id: 'holidayGuard', title: 'Holiday & Vacation Guard', description: 'Intelligent schedule override and callback interceptor', price: 149 },
  { id: 'crmSheet', title: 'Customer CRM Timeline', description: '1-click interaction history & customer lookup drawer', price: 199 },
  { id: 'maps', title: 'Google Maps 3-Pack SEO', description: 'Front-page local search directory placement', price: 350 },
  { id: 'bvm', title: 'BVM Campaign Page Arch', description: 'Hyper-focused landing page conversion architecture', price: 400 },
];

type Currency = 'USD' | 'CAD' | 'GBP' | 'EUR';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  CAD: 'CA$',
  GBP: '£',
  EUR: '€',
};

interface CustomPreset {
  name: string;
  selectedIds: string[];
}

interface QuotingEngineProps {
  clientName?: string;
  reportUrl?: string;
  monthlyLeakage?: number;
  industry?: string;
  isHighContrast?: boolean;
  onCopySummary?: (summary: string) => void;
  onDismiss?: () => void;
}

// 📱 Haptic + Synthesizer Audio Engine
const playTactileChime = (type: 'copy' | 'reset' | 'success' | 'click' | 'win') => {
  if (typeof window === 'undefined') return;

  if ('vibrate' in navigator) {
    if (type === 'click') navigator.vibrate(10);
    else if (type === 'copy' || type === 'success') navigator.vibrate([15, 30, 15]);
    else if (type === 'win') navigator.vibrate([30, 50, 30, 50, 100]);
    else if (type === 'reset') navigator.vibrate(40);
  }

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'copy' || type === 'success' || type === 'win') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
    }
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
};

export default function StreamlinedCompleteQuotingEngine({ 
  clientName = 'Valued Client', 
  monthlyLeakage = 2450,
  industry = 'Home Services',
  isHighContrast = false, 
  onCopySummary,
  onDismiss
}: QuotingEngineProps) {
  const DEFAULT_SELECTED_IDS = ['clientPortal', 'speed', 'missedCall', 'aiReception', 'socialProof', 'textToPay'];
  
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>(DEFAULT_SERVICES_LIST);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const [activePreset, setActivePreset] = useState<string>('custom');
  
  // Custom Presets State
  const [userPresets, setUserPresets] = useState<CustomPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  // Currency & Discounts
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isDiscountDrawerOpen, setIsDiscountDrawerOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'dollar' | 'percent'>('dollar');
  const [discountValue, setDiscountValue] = useState<number>(100);
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(7.5);
  const [dueTodayAmount, setDueTodayAmount] = useState<number>(500);
  const [bvmSolutionAmount, setBvmSolutionAmount] = useState<number>(1200);

  const PORTAL_WAIVED_VALUE = 299;

  // Urgency & Voice Notes
  const [isUrgencyBannerActive, setIsUrgencyBannerActive] = useState(false);
  const [countdownSeconds, setCheckCountdownSeconds] = useState(172800);
  const [proposalNotes, setProposalNotes] = useState<string>('');
  const [isListening, setIsListening] = useState(false);

  // Add Custom Service Modal
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(150);

  // Drag Gesture State
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  // Copy Feedback States
  const [copiedState, setCopiedState] = useState(false);
  const [copiedStripeState, setCopiedStripeState] = useState(false);
  const [copiedContractState, setCopiedContractState] = useState(false);

  // Restored Draft Pill
  const [restoredDraftTime, setRestoredDraftTime] = useState<string | null>(null);

  const currSym = CURRENCY_SYMBOLS[currency];

  useEffect(() => {
    const draftPayload = {
      selectedServiceIds,
      discountType,
      discountValue,
      dueTodayAmount,
      proposalNotes,
      currency,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`white_pine_quoter_draft_${clientName}`, JSON.stringify(draftPayload));
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedServiceIds, discountType, discountValue, dueTodayAmount, proposalNotes, currency, clientName]);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(`white_pine_quoter_draft_${clientName}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.selectedServiceIds) {
          setSelectedServiceIds(parsed.selectedServiceIds);
          setDiscountType(parsed.discountType || 'dollar');
          setDiscountValue(parsed.discountValue ?? 100);
          setDueTodayAmount(parsed.dueTodayAmount ?? 500);
          setProposalNotes(parsed.proposalNotes || '');
          setCurrency(parsed.currency || 'USD');
          setRestoredDraftTime(parsed.timestamp || 'recently');
        }
      }

      const savedPresets = localStorage.getItem('white_pine_user_presets');
      if (savedPresets) setUserPresets(JSON.parse(savedPresets));
    } catch {}
  }, [clientName]);

  useEffect(() => {
    let interval: any = null;
    if (isUrgencyBannerActive && countdownSeconds > 0) {
      interval = setInterval(() => setCheckCountdownSeconds((s) => s - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isUrgencyBannerActive, countdownSeconds]);

  const handleTouchStart = (e: React.TouchEvent) => setDragStartY(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const deltaY = e.touches[0].clientY - dragStartY;
    if (deltaY > 0) setDragOffset(deltaY);
  };
  const handleTouchEnd = () => {
    if (dragOffset > 130 && onDismiss) {
      playTactileChime('reset');
      onDismiss();
    } else {
      setDragOffset(0);
    }
    setDragStartY(null);
  };

  const formatCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVoiceDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice dictation requires Web Speech API support in browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setProposalNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    playTactileChime('success');
    const updated = [...userPresets, { name: newPresetName.trim(), selectedIds: selectedServiceIds }];
    setUserPresets(updated);
    try {
      localStorage.setItem('white_pine_user_presets', JSON.stringify(updated));
    } catch {}
    setNewPresetName('');
    setIsSavingPreset(false);
  };

  const handleApplyCustomPreset = (preset: CustomPreset) => {
    playTactileChime('success');
    setActivePreset(preset.name);
    setSelectedServiceIds(preset.selectedIds);
  };

  const handleDeleteCustomPreset = (presetName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playTactileChime('reset');
    const filtered = userPresets.filter((p) => p.name !== presetName);
    setUserPresets(filtered);
    try {
      localStorage.setItem('white_pine_user_presets', JSON.stringify(filtered));
    } catch {}
  };

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    playTactileChime('win');
    const newId = `custom_${Date.now()}`;
    const newService: ServiceOption = {
      id: newId,
      title: customTitle.trim(),
      description: 'Custom Tailored Agency Service Add-On',
      price: customPrice,
      isCustom: true
    };

    setAvailableServices((prev) => [...prev, newService]);
    setSelectedServiceIds((prev) => [...prev, newId]);
    setCustomTitle('');
    setCustomPrice(150);
    setIsAddCustomOpen(false);
  };

  const handleResetDefaults = () => {
    playTactileChime('reset');
    setAvailableServices(DEFAULT_SERVICES_LIST);
    setSelectedServiceIds(DEFAULT_SELECTED_IDS);
    setActivePreset('custom');
    setCurrency('USD');
    setDiscountType('dollar');
    setDiscountValue(100);
    setSalesTaxPercent(7.5);
    setDueTodayAmount(500);
    setBvmSolutionAmount(1200);
    setProposalNotes('');
    setIsUrgencyBannerActive(false);
    setRestoredDraftTime(null);
    try {
      localStorage.removeItem(`white_pine_quoter_draft_${clientName}`);
    } catch {}
  };

  const toggleServiceSelection = (id: string) => {
    if (id === 'clientPortal') return;

    playTactileChime('click');
    setActivePreset('custom');
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const applyPackagePreset = (preset: 'starter' | 'growth' | 'dominance') => {
    playTactileChime('success');
    setActivePreset(preset);
    if (preset === 'starter') {
      setSelectedServiceIds(['clientPortal', 'speed', 'missedCall', 'textToPay']);
      setDiscountValue(50);
      setDueTodayAmount(300);
    } else if (preset === 'growth') {
      setSelectedServiceIds(['clientPortal', 'speed', 'missedCall', 'aiReception', 'socialProof', 'reviews', 'textToPay', 'crmSheet']);
      setDiscountValue(150);
      setDueTodayAmount(500);
    } else if (preset === 'dominance') {
      setSelectedServiceIds(['clientPortal', 'speed', 'missedCall', 'aiReception', 'socialProof', 'ltvReactivation', 'textToPay', 'reviews', 'holidayGuard', 'crmSheet', 'maps', 'bvm']);
      setDiscountValue(300);
      setDueTodayAmount(1000);
    }
  };

  const rawServicesSubtotal = availableServices
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((acc, curr) => acc + curr.price, 0);

  const discountAmount = discountType === 'dollar' 
    ? discountValue 
    : (rawServicesSubtotal * (discountValue / 100));

  const postDiscountSubtotal = Math.max(0, rawServicesSubtotal - discountAmount);
  const calculatedTaxAmount = postDiscountSubtotal * (salesTaxPercent / 100);
  
  const whitePineTotal = Math.round(postDiscountSubtotal + calculatedTaxAmount);
  const bvmTotal = Math.round(bvmSolutionAmount);
  const dueTodayTotal = Math.round(dueTodayAmount);
  const overallTotal = bvmTotal + whitePineTotal;

  const calculateClosingConfidence = () => {
    let score = 55;
    if (monthlyLeakage > 2000) score += 15;
    if (selectedServiceIds.includes('speed') && selectedServiceIds.includes('missedCall')) score += 15;
    if (selectedServiceIds.includes('socialProof')) score += 8;
    if (selectedServiceIds.includes('ltvReactivation')) score += 10;
    if (discountValue >= 100) score += 8;
    return Math.min(98, score);
  };

  const closingScore = calculateClosingConfidence();

  const handleCopyStripeCheckoutLink = () => {
    playTactileChime('success');
    const stripeUrl = `https://buy.stripe.com/demo_checkout?amount=${dueTodayTotal}&client=${encodeURIComponent(clientName)}`;
    navigator.clipboard.writeText(stripeUrl);
    setCopiedStripeState(true);
    setTimeout(() => setCopiedStripeState(false), 2000);
  };

  const handleCopyContractLink = () => {
    playTactileChime('win');
    const contractUrl = `https://app.docusign.com/sign/demo_agreement?client=${encodeURIComponent(clientName)}&due=${dueTodayTotal}&retainer=${whitePineTotal}`;
    navigator.clipboard.writeText(contractUrl);
    setCopiedContractState(true);
    setTimeout(() => setCopiedContractState(false), 2000);
  };

  const handleCopy = () => {
    playTactileChime('success');
    const notesBlock = proposalNotes.trim() ? `\n\nSPECIAL TERMS / NOTES:\n${proposalNotes.trim()}` : '';
    const urgencyBlock = isUrgencyBannerActive ? `\n\n⚡ Fast-Action Waiver Active (Expires in ${formatCountdown(countdownSeconds)})` : '';
    const portalBonusBlock = `\n\n🎁 INCLUDED BONUS:\n• Executive Client Portal & AI Reception App (${currSym}${PORTAL_WAIVED_VALUE}/mo Software Fee WAIVED 100%)`;
    const summary = `PROPOSAL SUMMARY FOR ${clientName.toUpperCase()} (${industry.toUpperCase()}):\n• Base Campaign: ${currSym}${bvmTotal.toLocaleString()}\n• Monthly Retainer: ${currSym}${whitePineTotal.toLocaleString()}\n• Due Today: ${currSym}${dueTodayTotal.toLocaleString()}\n• Total Package Value: ${currSym}${overallTotal.toLocaleString()}${portalBonusBlock}${notesBlock}${urgencyBlock}`;
    
    navigator.clipboard.writeText(summary);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);

    if (onCopySummary) onCopySummary(summary);
  };

  return (
    <div 
      style={{ transform: `translateY(${dragOffset}px)`, transition: dragStartY ? 'none' : 'transform 0.25s ease-out' }}
      className={`border rounded-3xl p-3 sm:p-4 space-y-5 font-mono text-xs touch-pan-y backdrop-blur-2xl pb-28 shadow-[0_0_35px_rgba(99,102,241,0.18)] ${
        isHighContrast ? 'bg-black border-white text-white' : 'bg-[#0F172A]/95 border-indigo-500/30 text-slate-200'
      }`}
    >
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-16 h-1.5 bg-slate-600 rounded-full mx-auto -mt-1 mb-2 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-slate-500 transition-colors"
      >
        <div className="w-8 h-1 bg-slate-400 rounded-full" />
      </div>

      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div>
          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest block">White Pine Pricing Matrix • {industry}</span>
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">Interactive Quoter — {clientName}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-200 font-mono outline-none"
          >
            <option value="USD">USD ($)</option>
            <option value="CAD">CAD (CA$)</option>
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span>🎯</span> {closingScore}% Win Rate
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-200 uppercase transition-all cursor-pointer"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/40 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎁</span>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase block tracking-wider">SOFTWARE FEE WAIVER ACTIVE</span>
            <span className="text-xs font-bold text-white font-sans">Full Executive Portal & Mobile App Suite Included FREE</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="line-through text-slate-500 text-[10px] block font-mono">{currSym}{PORTAL_WAIVED_VALUE}/mo</span>
          <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
            {currSym}0/mo (100% FREE)
          </span>
        </div>
      </div>

      {restoredDraftTime && (
        <div className="bg-purple-950/60 border border-purple-500/40 px-3 py-1.5 rounded-xl flex items-center justify-between text-[10px] text-purple-200 animate-fadeIn">
          <span>💾 Restored active proposal draft ({restoredDraftTime})</span>
          <button onClick={() => setRestoredDraftTime(null)} className="font-bold hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {isUrgencyBannerActive && (
        <div className="bg-amber-950/60 border border-amber-500/50 p-2.5 rounded-2xl flex items-center justify-between text-[10px] text-amber-200 animate-pulse font-mono">
          <div className="flex items-center gap-2">
            <span>⚡ Fast-Action Onboarding Waiver Active:</span>
            <strong className="text-amber-400 font-bold tabular-nums">{formatCountdown(countdownSeconds)}</strong>
          </div>
          <button onClick={() => setIsUrgencyBannerActive(false)} className="text-xs hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">⚡ Packages:</span>
          <button type="button" onClick={() => applyPackagePreset('starter')} className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border active:scale-95 transition-all ${activePreset === 'starter' ? "bg-emerald-500 text-black font-black" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-800"}`}>🌱 Starter</button>
          <button type="button" onClick={() => applyPackagePreset('growth')} className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border active:scale-95 transition-all ${activePreset === 'growth' ? "bg-indigo-600 text-white font-black" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-800"}`}>🚀 Growth</button>
          <button type="button" onClick={() => applyPackagePreset('dominance')} className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border active:scale-95 transition-all ${activePreset === 'dominance' ? "bg-emerald-600 text-white font-black" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-800"}`}>👑 Dominance</button>

          {userPresets.map((preset) => (
            <div key={preset.name} className="flex items-center bg-purple-600/30 border border-purple-400/50 rounded-xl px-2 py-0.5 text-[10px]">
              <button type="button" onClick={() => handleApplyCustomPreset(preset)} className="text-purple-200 hover:text-white font-bold mr-1">{preset.name}</button>
              <button type="button" onClick={(e) => handleDeleteCustomPreset(preset.name, e)} className="text-slate-400 hover:text-red-400">✕</button>
            </div>
          ))}
        </div>

        <button 
          type="button" 
          onClick={() => setIsSavingPreset(!isSavingPreset)}
          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider cursor-pointer"
        >
          {isSavingPreset ? 'Close' : '💾 Save Current Selection as Preset'}
        </button>
      </div>

      {isSavingPreset && (
        <form onSubmit={handleSaveCustomPreset} className="bg-slate-900 border border-indigo-500/40 p-3 rounded-2xl flex items-center gap-2 font-mono">
          <input 
            type="text" 
            placeholder="Preset Name (e.g. HVAC Special)..." 
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs">Save Preset</button>
        </form>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-300 font-bold uppercase tracking-wider block">
            1. Select Services (Click to toggle à la carte)
          </span>
          <button 
            type="button" 
            onClick={() => setIsAddCustomOpen(!isAddCustomOpen)}
            className="text-emerald-400 hover:underline font-bold"
          >
            + Add Custom Service Item
          </button>
        </div>

        {isAddCustomOpen && (
          <form onSubmit={handleAddCustomService} className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-2xl space-y-2 font-mono">
            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Add Custom Agency Line Item:</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                placeholder="Service Title (e.g. VIP Dedicated Phone Line)" 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
              <input 
                type="number" 
                placeholder="Price $" 
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-28 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono tabular-nums outline-none"
              />
              <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">Add Item</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {availableServices.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            const isBonus = service.isWaivedBonus;

            return (
              <div
                key={service.id}
                onClick={() => toggleServiceSelection(service.id)}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between h-28 select-none touch-manipulation active:scale-98 ${
                  isBonus
                    ? "bg-emerald-950/50 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50 cursor-default"
                    : isSelected 
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer" 
                    : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className={`text-[10px] font-bold uppercase ${isBonus ? "text-emerald-300" : isSelected ? "text-emerald-300" : "text-slate-200"}`}>
                      {service.title}
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] shrink-0 ${isBonus ? "bg-emerald-400 border-emerald-300 text-black font-black" : isSelected ? "bg-emerald-500 border-emerald-400 text-black font-black" : "border-gray-500"}`}>
                      {isSelected || isBonus ? "✓" : ""}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">{service.description}</p>
                </div>

                <div className="text-right font-mono">
                  {isBonus ? (
                    <div>
                      <span className="line-through text-slate-500 text-[9px] block">{currSym}{PORTAL_WAIVED_VALUE}/mo</span>
                      <span className="font-black text-xs text-emerald-400">INCLUDED FREE</span>
                    </div>
                  ) : (
                    <div className="font-black text-xs text-emerald-400">{currSym}{service.price}/mo</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-slate-800 rounded-2xl bg-slate-950/80 overflow-hidden">
        <button 
          type="button" 
          onClick={() => setIsDiscountDrawerOpen(!isDiscountDrawerOpen)}
          className="w-full p-3 text-left font-mono text-[10px] font-bold uppercase text-indigo-300 flex justify-between items-center hover:bg-slate-900 cursor-pointer"
        >
          <span>⚙️ Adjust Discounts, Retainer Due Today & Proposal Voice Notes</span>
          <span>{isDiscountDrawerOpen ? '▲ Hide' : '▼ Expand'}</span>
        </button>

        {isDiscountDrawerOpen && (
          <div className="p-3 border-t border-slate-800 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Discount Amount ({discountType === 'dollar' ? currSym : '%'})</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono tabular-nums outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setDiscountType(discountType === 'dollar' ? 'percent' : 'dollar')}
                    className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] transition-colors"
                  >
                    {discountType === 'dollar' ? '$' : '%'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-amber-400 uppercase font-bold block mb-1">Initial Retainer Due Today</label>
                <input 
                  type="number" 
                  value={dueTodayAmount}
                  onChange={(e) => setDueTodayAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-amber-300 font-bold font-mono tabular-nums outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Sales Tax (%)</label>
                <input 
                  type="number" 
                  value={salesTaxPercent}
                  onChange={(e) => setSalesTaxPercent(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono tabular-nums outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-slate-400 uppercase font-bold">Special Proposal Notes / Terms</label>
                <button 
                  type="button" 
                  onClick={toggleVoiceDictation}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border-indigo-500/30'}`}
                >
                  {isListening ? '🎙️ Listening...' : '🎙️ Dictate Notes'}
                </button>
              </div>
              <textarea 
                rows={2} 
                value={proposalNotes}
                onChange={(e) => setProposalNotes(e.target.value)}
                placeholder="Enter custom terms or deal notes here..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setIsUrgencyBannerActive(!isUrgencyBannerActive)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${isUrgencyBannerActive ? 'bg-amber-500 text-black border-amber-400 font-black' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'}`}
              >
                {isUrgencyBannerActive ? '⚡ Fast-Action Urgency Timer: ON' : '⚡ Fast-Action Urgency Timer: OFF'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-indigo-950/60 via-slate-950 to-black border border-indigo-500/40 rounded-3xl p-3 sm:p-4 shadow-[0_0_25px_rgba(99,102,241,0.2)] space-y-3">
        <div className="text-[10px] uppercase font-black tracking-widest text-indigo-300 border-b border-slate-800 pb-2 flex justify-between items-center">
          <span>📊 Package Totals ({currency})</span>
          <span className="text-slate-400 text-[9px]">{selectedServiceIds.length} Services Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono tabular-nums">
          <div
            title="One-time BVM base campaign build cost"
            className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-colors p-3 rounded-2xl flex flex-col justify-between"
          >
            <span className="text-[9px] uppercase font-bold text-slate-400 font-sans">1. Base Campaign</span>
            <div className="text-lg font-black text-white mt-1">{currSym}{bvmTotal.toLocaleString()}</div>
          </div>

          <div
            title="Recurring monthly White Pine software & service retainer"
            className="bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-colors p-3 rounded-2xl flex flex-col justify-between"
          >
            <span className="text-[9px] uppercase font-bold text-emerald-400 font-sans">2. Monthly Retainer</span>
            <div className="text-lg font-black text-emerald-400 mt-1">{currSym}{whitePineTotal.toLocaleString()}</div>
          </div>

          <div
            title="Amount due today to kick off onboarding"
            className="bg-slate-950/80 border border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-800/80 transition-colors p-3 rounded-2xl flex flex-col justify-between"
          >
            <span className="text-[9px] uppercase font-bold text-amber-400 font-sans">3. Initial Retainer</span>
            <div className="text-lg font-black text-amber-400 mt-1">{currSym}{dueTodayTotal.toLocaleString()}</div>
          </div>

          <div
            title="Base Campaign + Monthly Retainer combined — the full package value"
            className="bg-indigo-600/30 border border-indigo-400/50 hover:bg-indigo-600/40 transition-colors p-3 rounded-2xl flex flex-col justify-between shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <span className="text-[9px] uppercase font-black text-indigo-200 font-sans">4. Overall Package Value</span>
            <div className="text-xl font-black text-white mt-1">{currSym}{overallTotal.toLocaleString()}</div>
            <span className="text-[9px] font-bold text-amber-300 mt-0.5">Due Today: {currSym}{dueTodayTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 no-print">
        <button
          type="button"
          onClick={handleCopyContractLink}
          className={`w-full py-3.5 px-4 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-all active:scale-95 border flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] min-h-[48px] ${
            copiedContractState
              ? "bg-emerald-500 border-emerald-400 text-black font-black"
              : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white"
          }`}
        >
          {copiedContractState ? "✓ e-Sign Link Copied!" : "✍️ Send e-Sign Contract"}
        </button>

        <button
          type="button"
          onClick={handleCopyStripeCheckoutLink}
          className={`w-full py-3.5 px-4 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-all active:scale-95 border flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.25)] min-h-[48px] ${
            copiedStripeState
              ? "bg-emerald-500 border-emerald-400 text-black font-black"
              : "bg-purple-600 hover:bg-purple-500 border-purple-400 text-white"
          }`}
        >
          {copiedStripeState ? "✓ Checkout Link Copied!" : "💳 Copy Checkout Link"}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-3.5 px-4 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-all active:scale-95 border flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.25)] min-h-[48px] ${
            copiedState 
              ? "bg-emerald-500 border-emerald-400 text-black font-black" 
              : "bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white"
          }`}
        >
          {copiedState ? "✓ Summary Copied!" : "📋 Copy Proposal Summary"}
        </button>
      </div>

    </div>
  );
}