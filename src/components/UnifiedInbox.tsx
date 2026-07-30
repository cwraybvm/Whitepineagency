'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, Mail, FormInput, CheckCircle2, Clock } from 'lucide-react';

interface InboxMessage {
  id: string;
  senderName: string;
  senderContact: string;
  channel: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function UnifiedInbox({ organizationId }: { organizationId: string }) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('ALL');

  useEffect(() => {
    fetchInbox();
  }, [organizationId]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterChannel === 'ALL' ? messages : messages.filter((m) => m.channel === filterChannel);

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'SMS':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"><PhoneCall className="w-3 h-3" /> SMS</span>;
      case 'FORM_LEAD':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"><FormInput className="w-3 h-3" /> Lead Form</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>;
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-neutral-400">Loading inbox communications...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Unified Client Inbox</h2>
            <p className="text-xs text-neutral-400">Real-time SMS, website form submissions, & inquiries</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
          {['ALL', 'SMS', 'FORM_LEAD', 'EMAIL'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-3 py-1 rounded-lg transition font-medium text-[11px] ${
                filterChannel === ch ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 text-center backdrop-blur-md">
          <CheckCircle2 className="w-8 h-8 text-sky-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-semibold text-white">Inbox Zero</h3>
          <p className="text-xs text-neutral-400 mt-1">No incoming client messages found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div key={msg.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">{msg.senderName}</span>
                  <span className="text-[11px] text-neutral-500">({msg.senderContact})</span>
                  {getChannelBadge(msg.channel)}
                </div>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-neutral-300 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 whitespace-pre-wrap">
                {msg.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}