'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Fira_Code } from 'next/font/google';
import { PhoneMissed, PhoneOff, Clock, Moon, Signal, Wifi, BatteryFull, Zap } from 'lucide-react';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

type MissedReason = 'No Answer' | 'Busy' | 'After Hours';

interface CallLogEntry {
  id: string;
  callerName: string;
  callerPhone: string;
  reason: MissedReason;
  time: string;
  status: 'Missed' | 'Auto Text Sent';
}

interface Message {
  id: string;
  from: 'business' | 'lead';
  text: string;
  time: string;
}

const PERSONAS = [
  { name: 'Mark Stevens', phone: '(555) 234-5678' },
  { name: 'Dave Miller', phone: '(555) 876-5432' },
  { name: 'Sarah Jenkins', phone: '(555) 345-6789' },
];

const REASONS: MissedReason[] = ['No Answer', 'Busy', 'After Hours'];

const AUTO_REPLIES: Record<MissedReason, string> = {
  'No Answer':
    "Hi there! Thanks for calling. Sorry we missed you—our team is currently assisting other customers. How can we help you out today?",
  Busy: "Hi there! Sorry we missed your call, our lines are busy right now. Text us here and we'll get right back to you.",
  'After Hours':
    "Thanks for calling! We're closed right now, but we saw you called. Let us know what you need and we'll respond first thing.",
};

const LEAD_REPLIES = [
  "Hey, thanks for the quick text! I need someone to look at my AC unit this week.",
  "Appreciate the response. Do you have availability tomorrow morning?",
  "Yes please, that would be great. What's the earliest you can come out?",
];

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MissedCallSimulatorPage() {
  const [personaIdx, setPersonaIdx] = useState(0);
  const [reason, setReason] = useState<MissedReason>('No Answer');
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ringing, setRinging] = useState(false);
  const [typing, setTyping] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const persona = PERSONAS[personaIdx];

  const triggerMissedCall = () => {
    if (ringing) return;
    setRinging(true);

    setTimeout(() => {
      setRinging(false);

      const entryId = crypto.randomUUID();
      setCallLog((prev) => [
        {
          id: entryId,
          callerName: persona.name,
          callerPhone: persona.phone,
          reason,
          time: nowTime(),
          status: 'Missed',
        },
        ...prev,
      ]);

      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: 'business',
            text: AUTO_REPLIES[reason],
            time: nowTime(),
          },
        ]);
        setCallLog((prev) =>
          prev.map((c) => (c.id === entryId ? { ...c, status: 'Auto Text Sent' } : c))
        );
      }, 1200);
    }, 1600);
  };

  const simulateLeadReply = () => {
    const reply = LEAD_REPLIES[messages.filter((m) => m.from === 'lead').length % LEAD_REPLIES.length];
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: 'lead', text: reply, time: nowTime() }]);
  };

  const lastMessageIsFromBusiness = messages.length > 0 && messages[messages.length - 1].from === 'business';

  return (
    <div
      className={`${firaCode.variable} min-h-screen bg-[#0F172A] text-gray-200 antialiased relative overflow-hidden`}
    >
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-8 max-w-[1400px] mx-auto space-y-6 font-sans">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> PROSPECTING DEMO
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Missed Call Text-Back Simulator
          </h1>
          <p className="text-xs text-slate-400">
            Trigger a mock inbound missed call and watch the automated SMS text-back fire in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* LEFT: Controls + call log */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Simulate Inbound Call
              </h2>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-mono uppercase">Caller</label>
                <div className="flex flex-wrap gap-2">
                  {PERSONAS.map((p, i) => (
                    <button
                      key={p.phone}
                      onClick={() => setPersonaIdx(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        personaIdx === i
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-mono uppercase">Missed Reason</label>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border ${
                        reason === r
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={triggerMissedCall}
                disabled={ringing}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <PhoneMissed className="w-4 h-4" />
                {ringing ? 'Ringing…' : 'Trigger Missed Call'}
              </button>

              {lastMessageIsFromBusiness && (
                <button
                  onClick={simulateLeadReply}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Simulate Customer Reply
                </button>
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Call Log
              </h2>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {callLog.length === 0 && (
                  <div className="p-6 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl font-mono">
                    No calls yet — trigger one above
                  </div>
                )}
                {callLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PhoneOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{entry.callerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {entry.callerPhone} · {entry.reason}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          entry.status === 'Auto Text Sent'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                        }`}
                      >
                        {entry.status}
                      </span>
                      <p className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5" /> {entry.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Phone mockup */}
          <div className="flex justify-center lg:sticky lg:top-8">
            <div className="w-[300px] h-[600px] bg-black rounded-[2.5rem] border-4 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-2xl z-20" />

              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[10px] font-mono text-white z-10">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <BatteryFull className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {persona.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{persona.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{persona.phone}</p>
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-950">
                {messages.length === 0 && !ringing && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 opacity-40 px-6">
                    <Moon className="w-6 h-6 text-slate-500" />
                    <p className="text-[10px] text-slate-500 font-mono">No messages yet</p>
                  </div>
                )}

                {ringing && (
                  <div className="flex justify-center">
                    <span className="text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full animate-pulse">
                      Incoming call… missed
                    </span>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === 'business' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${
                        m.from === 'business'
                          ? 'bg-purple-600 text-white rounded-br-sm'
                          : 'bg-slate-800 text-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {m.text}
                      <div className="text-[8px] opacity-60 font-mono mt-1">{m.time}</div>
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="flex justify-end">
                    <div className="bg-purple-600/60 rounded-2xl rounded-br-sm px-3 py-2 text-[11px] text-white">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
