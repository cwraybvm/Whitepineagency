'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { PhoneCall, MessageSquare, Send, Bot, Sparkles, RefreshCw, CheckCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'system' | 'ai' | 'lead';
  text: string;
  timestamp: string;
}

export default function SimulatorPage() {
  const [businessName, setBusinessName] = useState('Apex Mechanical Services');
  const [leadPhone, setLeadPhone] = useState('(555) 987-6543');
  const [simulating, setSimulating] = useState(false);
  const [step, setStep] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const startSimulation = () => {
    setSimulating(true);
    setStep(1);
    setMessages([
      {
        id: '1',
        sender: 'system',
        text: `🔴 Missed Call detected from ${leadPhone} at 6:42 PM (After Hours)`,
        timestamp: '6:42 PM',
      },
    ]);

    // Step 2: Instant Auto-Text
    setTimeout(() => {
      setStep(2);
      setMessages((prev) => [
        ...prev,
        {
          id: '2',
          sender: 'ai',
          text: `Hi there! Thanks for calling ${businessName}. Sorry we missed your call—our office is currently closed. How can we help you out today?`,
          timestamp: '6:42 PM',
        },
      ]);
    }, 1500);

    // Step 3: Customer Reply
    setTimeout(() => {
      setStep(3);
      setMessages((prev) => [
        ...prev,
        {
          id: '3',
          sender: 'lead',
          text: `Hey, my AC just started making a loud squealing noise and blowing warm air. Do you have emergency availability tomorrow morning?`,
          timestamp: '6:43 PM',
        },
      ]);
    }, 3500);

    // Step 4: AI Qualification
    setTimeout(() => {
      setStep(4);
      setMessages((prev) => [
        ...prev,
        {
          id: '4',
          sender: 'ai',
          text: `We can definitely help with that! We have an emergency slot open tomorrow between 8:00 AM – 11:00 AM. What is your home address so I can get you locked in?`,
          timestamp: '6:43 PM',
        },
      ]);
      setSimulating(false);
      toast.success('Simulation completed! Lead captured before competitor outreach.');
    }, 5500);
  };

  const resetSimulation = () => {
    setSimulating(false);
    setStep(0);
    setMessages([]);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> TIER 3 • DEMO & SALES ENGINE
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Missed Call Text-Back Simulator
          </h1>
          <p className="text-xs text-slate-400">
            Interactive live demo showing contractors how after-hours missed calls convert into leads in real time.
          </p>
        </div>

        <button
          onClick={resetSimulation}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Demo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Controls Panel */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-sky-400" /> Demo Parameters
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Prospect Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Simulated Caller Number</label>
              <input
                type="text"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={startSimulation}
              disabled={simulating}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Simulating Live Exchange...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Trigger Missed Call Simulation
                </>
              )}
            </button>
          </div>

          {/* Value Prop Callout */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase block">
              💡 Pitch Script for Prospects:
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              &quot;62% of home service callers hang up and call a competitor if they hit voicemail. Our automated text-back engages them within 15 seconds to lock in the job before someone else takes it.&quot;
            </p>
          </div>
        </div>

        {/* Live Smartphone Screen Preview */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl space-y-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            LIVE SMARTPHONE SIMULATION
          </span>

          {/* iPhone Outer Frame */}
          <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-[3rem] p-4 shadow-2xl space-y-4 min-h-[480px] flex flex-col justify-between">

            {/* Phone Header */}
            <div className="text-center pt-2 pb-2 border-b border-slate-800/80 space-y-1">
              <div className="w-16 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white tracking-tight">{businessName}</h4>
              <p className="text-[9px] text-emerald-400 font-mono">AI Safety Net Active</p>
            </div>

            {/* Chat Bubble Stream */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] p-2">
              {messages.length === 0 && (
                <div className="text-center py-20 text-slate-600 text-xs font-mono">
                  Press &quot;Trigger Missed Call Simulation&quot; to test.
                </div>
              )}

              {messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-300 font-mono text-center">
                      {msg.text}
                    </div>
                  );
                }

                const isAI = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} space-y-1`}
                  >
                    <span className="text-[8px] font-mono text-slate-500 px-1">
                      {isAI ? 'Auto-Responder' : 'Customer'} • {msg.timestamp}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        isAI
                          ? 'bg-sky-600 text-white rounded-tl-xs'
                          : 'bg-slate-800 text-slate-100 rounded-tr-xs border border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phone Footer Status */}
            <div className="pt-2 border-t border-slate-800/80 text-center">
              {step === 4 ? (
                <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Lead Captured & Saved
                </span>
              ) : (
                <span className="text-[9px] text-slate-500 font-mono">
                  {simulating ? 'Processing response...' : 'Standby Mode'}
                </span>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
