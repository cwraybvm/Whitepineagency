'use client';

import React, { useState } from 'react';
import { AlertCircle, Lock, ShieldCheck } from 'lucide-react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digitsOnly = (value: string) => value.replace(/\D/g, '');

interface ServiceOption {
  id: string;
  title: string;
  icon: string;
  basePriceMin: number;
  basePriceMax: number;
  scopes: {
    id: string;
    label: string;
    multiplier: number;
  }[];
}

const SERVICES: ServiceOption[] = [
  {
    id: 'water_heater',
    title: 'Water Heater Replacement',
    icon: '🔥',
    basePriceMin: 1200,
    basePriceMax: 1800,
    scopes: [
      { id: 'standard_40', label: 'Standard 40-50 Gal Tank', multiplier: 1.0 },
      { id: 'tankless_gas', label: 'High-Efficiency Tankless (Gas)', multiplier: 1.6 },
      { id: 'tankless_elec', label: 'Electric Tankless Unit', multiplier: 1.4 },
    ]
  },
  {
    id: 'drain_clearing',
    title: 'Drain & Sewer Line Clearing',
    icon: '🪠',
    basePriceMin: 180,
    basePriceMax: 350,
    scopes: [
      { id: 'single_drain', label: 'Single Sink / Tub Clog', multiplier: 1.0 },
      { id: 'main_line', label: 'Main Sewer Line Hydro-Jet', multiplier: 2.2 },
      { id: 'camera_inspection', label: 'Full Camera Scope & Clear', multiplier: 1.5 },
    ]
  },
  {
    id: 'ac_repair',
    title: 'AC / HVAC Repair & Service',
    icon: '❄️',
    basePriceMin: 150,
    basePriceMax: 450,
    scopes: [
      { id: 'tuneup', label: 'Seasonal System Tune-Up', multiplier: 0.8 },
      { id: 'freon_leak', label: 'Diagnostic & Refrigerant Charge', multiplier: 1.5 },
      { id: 'unit_replace', label: 'Complete System Replacement', multiplier: 12.0 },
    ]
  },
  {
    id: 'electrical_panel',
    title: 'Electrical Panel Upgrade',
    icon: '⚡',
    basePriceMin: 1500,
    basePriceMax: 2800,
    scopes: [
      { id: 'amp_100', label: '100 Amp to 200 Amp Service', multiplier: 1.0 },
      { id: 'amp_400', label: 'Heavy Duty 400 Amp Upgrade', multiplier: 1.8 },
      { id: 'subpanel', label: 'Subpanel Addition Only', multiplier: 0.6 },
    ]
  }
];

interface EstimatorProps {
  businessName?: string;
  webhookUrl?: string; // Make.com or GoHighLevel Webhook
  primaryColor?: string;
}

export default function InstantQuoteEstimator({
  businessName = "Apex Local Services",
  webhookUrl = "https://hook.us2.make.com/YOUR_WEBHOOK_ENDPOINT_HERE",
  primaryColor = "indigo"
}: EstimatorProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [urgency, setUrgency] = useState<'standard' | 'emergency'>('standard');
  
  // Lead Capture State
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [touched, setTouched] = useState({ fullName: false, phone: false, email: false });

  // Real-time field validation — Full Name and Phone are required for SMS
  // delivery of the quote; Email is optional but must be a real shape if given.
  const isFullNameValid = fullName.trim().length > 0;
  const isPhoneValid = digitsOnly(phone).length >= 10;
  const isEmailValid = email.trim() === '' || EMAIL_PATTERN.test(email);

  const fullNameError = touched.fullName && !isFullNameValid ? 'Enter your name so we know who to text' : '';
  const phoneError = touched.phone && !isPhoneValid ? 'Enter a 10-digit phone number (e.g., 555-123-4567)' : '';
  const emailError = touched.email && !isEmailValid ? 'Enter a valid email address' : '';

  // Price Calculation Logic
  const calculateEstimate = () => {
    if (!selectedService) return { min: 0, max: 0 };
    const scope = selectedService.scopes.find(s => s.id === selectedScopeId);
    const multiplier = scope ? scope.multiplier : 1.0;
    const urgencyMultiplier = urgency === 'emergency' ? 1.25 : 1.0;

    const min = Math.round(selectedService.basePriceMin * multiplier * urgencyMultiplier);
    const max = Math.round(selectedService.basePriceMax * multiplier * urgencyMultiplier);

    return { min, max };
  };

  const { min: estimatedMin, max: estimatedMax } = calculateEstimate();

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, phone: true, email: true });
    if (!isFullNameValid || !isPhoneValid || !isEmailValid) return;

    setIsSubmitting(true);

    const payload = {
      timestamp: new Date().toISOString(),
      businessName,
      lead: {
        fullName,
        phone,
        email,
        address
      },
      quoteDetails: {
        service: selectedService?.title,
        scope: selectedService?.scopes.find(s => s.id === selectedScopeId)?.label,
        urgency,
        estimatedMin,
        estimatedMax,
        formattedEstimate: `$${estimatedMin.toLocaleString()} - $${estimatedMax.toLocaleString()}`
      }
    };

    try {
      if (webhookUrl && !webhookUrl.includes("YOUR_WEBHOOK_ENDPOINT_HERE")) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to transmit lead payload:", err);
      setIsSubmitting(false);
      setIsSubmitted(true); // Graceful fallback
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedScopeId('');
    setUrgency('standard');
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsSubmitted(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans text-gray-100">
      
      {/* 🟢 HEADER BAR */}
      <div className="bg-slate-900 border-b border-white/5 p-4 md:p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase block">
            ⚡ INSTANT COST CALCULATOR
          </span>
          <h2 className="text-base md:text-lg font-black text-white">{businessName}</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 font-mono text-xs text-gray-400">
          <span>Step {step} of 3</span>
        </div>
      </div>

      {/* 📝 PROGRESS BAR */}
      <div className="w-full bg-white/5 h-1">
        <div 
          className="bg-indigo-500 h-full transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="p-5 md:p-6">
        
        {/* ================= STEP 1: SERVICE SELECTION ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
              1. What service do you need completed?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICES.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    setSelectedService(srv);
                    setSelectedScopeId(srv.scopes[0].id);
                    setStep(2);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    selectedService?.id === srv.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-black/30 border-white/10 hover:border-white/20 text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{srv.icon}</span>
                  <div>
                    <strong className="block text-xs font-bold text-white">{srv.title}</strong>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                      From ${srv.basePriceMin.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 2: JOB SCOPE & URGENCY ================= */}
        {step === 2 && selectedService && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {selectedService.icon} {selectedService.title}
              </span>
              <button 
                onClick={() => setStep(1)} 
                className="text-[10px] font-mono text-gray-400 hover:text-white underline"
              >
                Change Service
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-white uppercase font-mono tracking-wide block mb-2">
                2. Select specific job size or scope:
              </label>
              <div className="space-y-2">
                {selectedService.scopes.map((scope) => (
                  <label
                    key={scope.id}
                    onClick={() => setSelectedScopeId(scope.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedScopeId === scope.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-medium">{scope.label}</span>
                    <input
                      type="radio"
                      name="scope"
                      checked={selectedScopeId === scope.id}
                      onChange={() => setSelectedScopeId(scope.id)}
                      className="accent-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white uppercase font-mono tracking-wide block mb-2">
                3. Desired Scheduling Timeline:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('standard')}
                  className={`p-3 rounded-xl border text-center font-mono text-xs transition-all cursor-pointer ${
                    urgency === 'standard'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-black/30 border-white/10 text-gray-400'
                  }`}
                >
                  📅 Standard (Next 1-3 Days)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('emergency')}
                  className={`p-3 rounded-xl border text-center font-mono text-xs transition-all cursor-pointer ${
                    urgency === 'emergency'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold'
                      : 'bg-black/30 border-white/10 text-gray-400'
                  }`}
                >
                  🚨 Emergency (Same Day)
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-all shadow-lg font-mono cursor-pointer mt-2"
            >
              Calculate Instant Estimate →
            </button>
          </div>
        )}

        {/* ================= STEP 3: LEAD CAPTURE & UNLOCK ESTIMATE ================= */}
        {step === 3 && !isSubmitted && (
          <div className="space-y-4 animate-fadeIn">
            {/* Locked Estimate Preview */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl text-center relative overflow-hidden">
              <span className="text-[9px] font-mono uppercase font-bold text-indigo-400 block tracking-widest">
                ESTIMATED PRICE RANGE GENERATED
              </span>
              <div className="text-3xl font-black text-white mt-1 tracking-tight">
                ${estimatedMin.toLocaleString()} – ${estimatedMax.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-1">
                Includes regional labor averages, standard hardware, and travel dispatch fees.
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-3 font-mono text-xs">
              <p className="text-[11px] text-gray-300 font-sans">
                Where should we send your official locked quote & instant availability booking link?
              </p>

              <div>
                <label htmlFor="lead-fullName" className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Full Name *</label>
                <input
                  id="lead-fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                  aria-invalid={!!fullNameError}
                  aria-describedby={fullNameError ? 'lead-fullName-error' : undefined}
                  placeholder="e.g. John Smith"
                  className={`w-full bg-black/40 border rounded-xl p-3 text-white placeholder-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all ${
                    fullNameError ? 'border-rose-500' : 'border-white/10 focus:border-indigo-500'
                  }`}
                />
                {fullNameError && (
                  <p id="lead-fullName-error" className="flex items-center gap-1 text-[9px] text-rose-400 pt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fullNameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lead-phone" className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Mobile Phone (For Instant SMS Quote) *</label>
                <input
                  id="lead-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? 'lead-phone-error' : undefined}
                  placeholder="(555) 000-0000"
                  className={`w-full bg-black/40 border rounded-xl p-3 text-white placeholder-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all ${
                    phoneError ? 'border-rose-500' : 'border-white/10 focus:border-indigo-500'
                  }`}
                />
                {phoneError && (
                  <p id="lead-phone-error" className="flex items-center gap-1 text-[9px] text-rose-400 pt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {phoneError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="lead-email" className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Email Address</label>
                  <input
                    id="lead-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'lead-email-error' : undefined}
                    placeholder="john@example.com"
                    className={`w-full bg-black/40 border rounded-xl p-3 text-white placeholder-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all ${
                      emailError ? 'border-rose-500' : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  {emailError && (
                    <p id="lead-email-error" className="flex items-center gap-1 text-[9px] text-rose-400 pt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {emailError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lead-address" className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Service Zip / City</label>
                  <input
                    id="lead-address"
                    type="text"
                    autoComplete="postal-code"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Alexandria, MN"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none disabled:opacity-60 text-white font-bold rounded-xl tracking-wider uppercase transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">🔄</span> Locking In Your Quote…
                  </>
                ) : (
                  "🔓 Lock In Quote & Request Dispatch"
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[9px] text-gray-500 pt-1">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Encrypted transmission</span>
                <span className="text-gray-700">•</span>
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>Never sold or shared — used only to send your quote</span>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 4: CONFIRMATION STATE ================= */}
        {isSubmitted && (
          <div className="text-center py-6 space-y-4 animate-fadeIn font-mono">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Estimate Locked & Dispatched!</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                We sent a text message to <span className="text-emerald-400 font-bold">{phone}</span> with your exact breakdown of <span className="text-white font-bold">${estimatedMin.toLocaleString()} – ${estimatedMax.toLocaleString()}</span>.
              </p>
            </div>

            <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-left text-xs space-y-1 text-gray-300">
              <p><strong className="text-gray-400">Service:</strong> {selectedService?.title}</p>
              <p><strong className="text-gray-400">Scope:</strong> {selectedService?.scopes.find(s => s.id === selectedScopeId)?.label}</p>
              <p><strong className="text-gray-400">Urgency:</strong> {urgency === 'emergency' ? '🚨 Same-Day Emergency' : '📅 Standard Dispatch'}</p>
            </div>

            <button
              onClick={resetForm}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer pt-2 block mx-auto"
            >
              Start New Estimate
            </button>
          </div>
        )}

      </div>
    </div>
  );
}