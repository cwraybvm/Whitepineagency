'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  ClipboardCheck, 
  Copy, 
  Check, 
  Send, 
  Sparkles, 
  KeyRound, 
  PhoneCall, 
  CheckCircle2 
} from 'lucide-react';

export default function OnboardingGeneratorPage() {
  const [clientName, setClientName] = useState('Apex Mechanical');
  const [ownerName, setOwnerName] = useState('Mark');
  const [ownerPhone, setOwnerPhone] = useState('(555) 234-5678');
  const [intakeLink, setIntakeLink] = useState('https://youragency.com/intake');

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Dynamic Templates
  const welcomeSms = `Hi ${ownerName}! Welcome to the agency family 🚀 To get your ${clientName} AI Safety Net & Google Review setup live, please tap this link to upload your logo & offer details: ${intakeLink}`;

  const gbpInstructions = `Hi ${ownerName}, to connect your Google Business Profile for automated review responses:\n1. Open Google Maps and search for ${clientName}.\n2. Click the 3 dots (⋮) top right -> 'Business Profile Settings'.\n3. Click 'Managers' -> 'Add Manager'.\n4. Add our agency email: setup@whitepineagency.com as Manager.`;

  const twilioSetupGuide = `Twilio Phone Provisioning Checklist for ${clientName}:\n[ ] Provision local 10DLC phone number\n[ ] Configure Missed-Call Webhook -> https://youragency.com/api/webhooks/call\n[ ] Verify A2P 10DLC Brand & Campaign Registration\n[ ] Set Auto-Responder Delay to 15 seconds`;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Onboarding sequence copied!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> TIER 3 • CLIENT FULFILLMENT
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Automated Client Onboarding Sequence Kit
          </h1>
          <p className="text-xs text-slate-400">
            Generate customized welcome scripts, access requests, and technical setup checklists in 1 click.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" /> Client Parameters
          </h3>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Business Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Owner First Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Owner Cell Phone</label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Intake Portal URL</label>
              <input
                type="text"
                value={intakeLink}
                onChange={(e) => setIntakeLink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Generated Sequences Column */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Card 1: Welcome SMS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-sky-400 font-mono uppercase flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> 1. Client Welcome SMS
              </span>
              <button
                onClick={() => copyToClipboard(welcomeSms, 'sms')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'sms' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy SMS</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 font-mono leading-relaxed">
              {welcomeSms}
            </div>
          </div>

          {/* Card 2: GBP Manager Access Request */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> 2. Google Business Manager Guide
              </span>
              <button
                onClick={() => copyToClipboard(gbpInstructions, 'gbp')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'gbp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Guide</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-line">
              {gbpInstructions}
            </div>
          </div>

          {/* Card 3: Technical Provisioning Checklist */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5" /> 3. Agency Technical Provisioning Checklist
              </span>
              <button
                onClick={() => copyToClipboard(twilioSetupGuide, 'twilio')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'twilio' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Checklist</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-line">
              {twilioSetupGuide}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}