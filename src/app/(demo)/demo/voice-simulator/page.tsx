'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fira_Code } from 'next/font/google';
import {
  AudioWaveform,
  PhoneIncoming,
  PhoneCall,
  PhoneOff,
  Moon,
  Sparkles,
  Activity,
  CalendarCheck,
  Database,
  RotateCcw,
} from 'lucide-react';
import DemoPortalNav from '@/components/demo/DemoPortalNav';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

type Speaker = 'ai' | 'caller';
type Sentiment = 'Neutral' | 'Stressed' | 'Urgent' | 'Relieved';
type CallState = 'idle' | 'ringing' | 'live' | 'ended';

type ScriptTurn =
  | { type: 'speech'; speaker: Speaker; text: string; sentiment?: Sentiment }
  | { type: 'action'; label: string };

type TranscriptEntry =
  | { id: string; kind: 'speech'; speaker: Speaker; text: string; sentiment?: Sentiment; time: string }
  | { id: string; kind: 'action'; label: string; time: string };

const CALL_SCRIPT: ScriptTurn[] = [
  {
    type: 'speech',
    speaker: 'ai',
    text: "Thanks for calling Whitepine Heating & Air — this is the after-hours AI assistant. What's going on tonight?",
  },
  {
    type: 'speech',
    speaker: 'caller',
    text: "Our furnace just died and it's 11 degrees outside — the house is already down to 45. We've got a newborn at home.",
    sentiment: 'Urgent',
  },
  { type: 'action', label: 'Intent detected: No-Heat Emergency (Residential)' },
  {
    type: 'speech',
    speaker: 'ai',
    text: 'That qualifies for emergency dispatch. I can get a technician out tonight — can I get the service address?',
  },
  { type: 'speech', speaker: 'caller', text: "It's 1420 Birchwood Lane, Stillwater.", sentiment: 'Stressed' },
  { type: 'action', label: 'CRM lookup: no match found — creating new contact' },
  { type: 'speech', speaker: 'ai', text: 'Got it. And the best callback number in case the tech needs to reach you?' },
  { type: 'speech', speaker: 'caller', text: '555-201-4487.', sentiment: 'Stressed' },
  { type: 'action', label: 'Checking on-call technician calendar…' },
  { type: 'action', label: 'Slot held: Emergency window 12:30 AM – 2:30 AM' },
  {
    type: 'speech',
    speaker: 'ai',
    text: 'I have an emergency tech available tonight between 12:30 and 2:30 AM. After-hours dispatch fee is $129, waived if it turns out to be a covered repair. Want me to book that?',
  },
  { type: 'speech', speaker: 'caller', text: 'Yes, please — whatever it takes, thank you so much.', sentiment: 'Relieved' },
  { type: 'action', label: 'Booking confirmed: Job #HV-2291 synced to CRM pipeline' },
  { type: 'action', label: 'Confirmation SMS queued to (555) 201-4487' },
  {
    type: 'speech',
    speaker: 'ai',
    text: "You're all set — Marcus will call 15 minutes out. Bundle up, we'll have your heat back on tonight.",
  },
  { type: 'speech', speaker: 'caller', text: 'Thank you, seriously — I really appreciate it.', sentiment: 'Relieved' },
  { type: 'action', label: 'Call summary logged · CSAT prediction: 96%' },
];

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  Neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Stressed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Urgent: 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse',
  Relieved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ponytail: fixed word-reveal cadence rather than a real ASR partial-hypothesis
// stream. Good enough to sell the "live transcription" feel in a demo;
// swap for real streaming tokens if this ever wires to an actual STT engine.
const TOKEN_DELAY_MS = 65;

export default function VoiceSimulatorPage() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveCallerText, setLiveCallerText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [booked, setBooked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activityRef = useRef(0);
  const displayedAmpRef = useRef(0);
  const speakerColorRef = useRef<Speaker | 'idle'>('idle');
  const runTokenRef = useRef(0);
  const barPhasesRef = useRef(Array.from({ length: 56 }, () => Math.random() * Math.PI * 2));

  // Canvas waveform loop — reads refs only, never triggers React re-renders per frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const colors: Record<Speaker | 'idle', [string, string]> = {
      ai: ['#a855f7', '#7c3aed'],
      caller: ['#22d3ee', '#0891b2'],
      idle: ['#334155', '#1e293b'],
    };

    const draw = (t: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      displayedAmpRef.current += (activityRef.current - displayedAmpRef.current) * 0.08;
      const amp = displayedAmpRef.current;
      const [c1, c2] = colors[speakerColorRef.current];
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;

      const bars = barPhasesRef.current;
      const barWidth = w / bars.length;
      const mid = h / 2;
      bars.forEach((phase, i) => {
        const wave = Math.sin(t * 0.003 + phase) * 0.5 + Math.sin(t * 0.006 + phase * 1.7) * 0.3;
        const base = 0.05 + 0.03 * (Math.sin(t * 0.001 + i) * 0.5 + 0.5);
        const barAmp = Math.max(0.04, Math.min(1, base + amp * (0.55 + 0.45 * wave)));
        const barH = barAmp * h * 0.9;
        const x = i * barWidth + barWidth * 0.18;
        const bw = barWidth * 0.64;
        ctx.beginPath();
        const r = Math.min(bw / 2, 3);
        const y = mid - barH / 2;
        ctx.roundRect(x, y, bw, barH, r);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const pushEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const runCall = useCallback(async () => {
    const token = ++runTokenRef.current;
    const stillCurrent = () => runTokenRef.current === token;

    setTranscript([]);
    setSentiment(null);
    setBooked(false);
    setLiveCallerText('');
    setAiGenerating(false);
    activityRef.current = 0;
    speakerColorRef.current = 'idle';

    setCallState('ringing');
    activityRef.current = 0.15;
    await sleep(1500);
    if (!stillCurrent()) return;

    setCallState('live');

    for (const turn of CALL_SCRIPT) {
      if (!stillCurrent()) return;

      if (turn.type === 'action') {
        await sleep(550);
        if (!stillCurrent()) return;
        pushEntry({ id: crypto.randomUUID(), kind: 'action', label: turn.label, time: nowTime() });
        if (turn.label.startsWith('Booking confirmed')) setBooked(true);
        continue;
      }

      speakerColorRef.current = turn.speaker;
      activityRef.current = 1;

      if (turn.speaker === 'caller') {
        const words = turn.text.split(' ');
        let acc = '';
        for (const word of words) {
          if (!stillCurrent()) return;
          acc = acc ? `${acc} ${word}` : word;
          setLiveCallerText(acc);
          await sleep(TOKEN_DELAY_MS + Math.random() * 40);
        }
        if (!stillCurrent()) return;
        setLiveCallerText('');
        if (turn.sentiment) setSentiment(turn.sentiment);
        pushEntry({
          id: crypto.randomUUID(),
          kind: 'speech',
          speaker: 'caller',
          text: turn.text,
          sentiment: turn.sentiment,
          time: nowTime(),
        });
      } else {
        setAiGenerating(true);
        await sleep(650);
        if (!stillCurrent()) return;
        setAiGenerating(false);
        pushEntry({ id: crypto.randomUUID(), kind: 'speech', speaker: 'ai', text: turn.text, time: nowTime() });
      }

      activityRef.current = 0.12;
      await sleep(350 + Math.random() * 250);
    }

    if (!stillCurrent()) return;
    speakerColorRef.current = 'idle';
    activityRef.current = 0.04;
    setCallState('ended');
  }, [pushEntry]);

  const resetCall = useCallback(() => {
    runTokenRef.current += 1;
    activityRef.current = 0;
    speakerColorRef.current = 'idle';
    setCallState('idle');
    setTranscript([]);
    setLiveCallerText('');
    setAiGenerating(false);
    setSentiment(null);
    setBooked(false);
  }, []);

  const statusMeta: Record<CallState, { label: string; icon: React.ElementType; color: string }> = {
    idle: { label: 'Standing By', icon: Moon, color: 'text-slate-400' },
    ringing: { label: 'Incoming Call…', icon: PhoneIncoming, color: 'text-amber-400 animate-pulse' },
    live: { label: 'Call Live', icon: PhoneCall, color: 'text-emerald-400' },
    ended: { label: 'Call Ended', icon: PhoneOff, color: 'text-slate-400' },
  };
  const Status = statusMeta[callState];
  const StatusIcon = Status.icon;

  return (
    <div
      className={`${firaCode.variable} min-h-screen bg-[#0F172A] text-gray-200 antialiased relative overflow-hidden`}
    >
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-purple-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-8 max-w-[1400px] mx-auto space-y-6 font-sans">
        <DemoPortalNav />

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <AudioWaveform className="w-3.5 h-3.5" /> AI VOICE DEMO
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">After-Hours AI Voice Receptionist</h1>
          <p className="text-xs text-slate-400">
            Simulates an inbound HVAC emergency call handled end-to-end by the AI receptionist — dispatch booking
            and CRM sync included.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* LEFT: visualizer + controls */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <StatusIcon className={`w-3.5 h-3.5 ${Status.color}`} /> {Status.label}
                </h2>
                {booked && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                    <CalendarCheck className="w-2.5 h-2.5" /> Dispatch Booked
                  </span>
                )}
              </div>

              <canvas ref={canvasRef} className="w-full h-40 rounded-xl bg-slate-950 border border-slate-800" />

              <div className="flex gap-2">
                <button
                  onClick={runCall}
                  disabled={callState === 'ringing' || callState === 'live'}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <PhoneIncoming className="w-4 h-4" />
                  {callState === 'idle' ? 'Simulate After-Hours Call' : 'Call In Progress…'}
                </button>
                {callState !== 'idle' && (
                  <button
                    onClick={resetCall}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Live Caller Sentiment
              </h2>
              {sentiment ? (
                <span
                  className={`inline-flex text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${SENTIMENT_COLORS[sentiment]}`}
                >
                  {sentiment}
                </span>
              ) : (
                <p className="text-[11px] text-slate-600 font-mono">No signal yet — start the call.</p>
              )}
            </div>
          </div>

          {/* RIGHT: live transcript */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 h-[640px] flex flex-col">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Live Transcript
              </h2>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {transcript.length === 0 && !liveCallerText && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 opacity-40 px-6">
                    <Moon className="w-6 h-6 text-slate-500" />
                    <p className="text-[10px] text-slate-500 font-mono">Waiting for a call…</p>
                  </div>
                )}

                {transcript.map((entry) =>
                  entry.kind === 'action' ? (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 bg-slate-950 border-l-2 border-emerald-500/50 border-y border-r border-slate-800 rounded-lg px-3 py-2"
                    >
                      <Database className="w-3 h-3 text-emerald-400 shrink-0" />
                      <p className="text-[10px] text-emerald-300 font-mono flex-1">{entry.label}</p>
                      <span className="text-[8px] text-slate-600 font-mono shrink-0">{entry.time}</span>
                    </div>
                  ) : (
                    <div
                      key={entry.id}
                      className={`flex ${entry.speaker === 'ai' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${
                          entry.speaker === 'ai'
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-slate-800 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[8px] font-mono font-bold opacity-70 uppercase">
                            {entry.speaker === 'ai' ? 'AI Receptionist' : 'Caller'}
                          </span>
                          {entry.sentiment && (
                            <span
                              className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${SENTIMENT_COLORS[entry.sentiment]}`}
                            >
                              {entry.sentiment}
                            </span>
                          )}
                        </div>
                        {entry.text}
                        <div className="text-[8px] opacity-60 font-mono mt-1">{entry.time}</div>
                      </div>
                    </div>
                  )
                )}

                {liveCallerText && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] leading-snug bg-slate-800/60 border border-dashed border-cyan-500/40 text-gray-200">
                      <span className="text-[8px] font-mono font-bold opacity-70 uppercase block mb-0.5 text-cyan-300">
                        Caller · live ASR
                      </span>
                      {liveCallerText}
                      <span className="inline-block w-1 h-3 bg-cyan-400 ml-0.5 align-middle animate-pulse" />
                    </div>
                  </div>
                )}

                {aiGenerating && (
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
