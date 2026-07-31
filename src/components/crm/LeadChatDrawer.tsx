'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, MessageSquare, Send, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface LeadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  createdAt: string;
}

interface LeadChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: { id: string; businessName: string; phone: string } | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeadChatDrawer({ isOpen, onClose, lead }: LeadChatDrawerProps) {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async (leadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/twilio/sms?leadId=${leadId}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch {
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && lead) fetchHistory(lead.id);
    if (!isOpen) {
      setMessages([]);
      setDraft('');
    }
  }, [isOpen, lead, fetchHistory]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!lead || !draft.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/twilio/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.phone, message: draft.trim(), leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');

      setMessages((prev) => [
        ...prev,
        data.message ?? {
          id: `local-${Date.now()}`,
          direction: 'outbound',
          body: draft.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setDraft('');
      toast.success(`Reply sent to "${lead.businessName}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && lead && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#080E1A] border-l border-white/10 z-[150] shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-white/10 p-6 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{lead.businessName}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{lead.phone}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-12 text-slate-500 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 opacity-50 px-6 py-12">
                  <MessageSquare className="w-6 h-6 text-slate-500" />
                  <p className="text-[10px] text-slate-500 font-mono">No messages yet</p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-snug ${
                      m.direction === 'outbound'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-white/10 text-gray-100 rounded-bl-sm'
                    }`}
                  >
                    <span className="text-[8px] font-mono opacity-70 flex items-center gap-1 mb-0.5">
                      {m.direction === 'outbound' ? (
                        <>
                          <ArrowUpRight className="w-2.5 h-2.5" /> OUTBOUND
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="w-2.5 h-2.5" /> INBOUND
                        </>
                      )}
                    </span>
                    {m.body}
                    <div className="text-[8px] opacity-60 font-mono mt-1">{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              ))}

              <div ref={threadEndRef} />
            </div>

            <div className="border-t border-white/10 p-4 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Type a reply…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={sendReply}
                disabled={sending || !draft.trim()}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Reply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
