'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';

interface BrainDumpModalProps {
  onClose: () => void;
  onCreated: (count: number) => void;
}

// Chrome/Edge only — no polyfill, mic button just doesn't render elsewhere.
function getSpeechRecognition(): typeof window.SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export default function BrainDumpModal({ onClose, onCreated }: BrainDumpModalProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(null);
  const SpeechRecognition = getSpeechRecognition();

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  function toggleListening() {
    if (!SpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const chunk = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ');
      setText((prev) => (prev ? `${prev} ${chunk}` : chunk));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Brain dump failed');
        return;
      }
      onCreated(body.tasks?.length ?? 0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Quick Brain Dump
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Paste or dictate everything on your mind. We&apos;ll split it into clean tasks with
          micro-steps already attached.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. follow up with the Simmons account, renew the domain before it expires, draft next week's newsletter..."
          rows={8}
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none"
        />

        <div className="flex items-center justify-between gap-2">
          {SpeechRecognition ? (
            <button
              onClick={toggleListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                listening ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {listening ? 'Stop dictating' : 'Dictate'}
            </button>
          ) : (
            <span />
          )}

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {submitting ? 'Parsing…' : 'Parse into Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}
