'use client';

import { useEffect, useState } from 'react';
import { X, Rss, Copy, Check, Loader2 } from 'lucide-react';

interface IcalSubscribeModalProps {
  onClose: () => void;
}

export default function IcalSubscribeModal({ onClose }: IcalSubscribeModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/calendar/feed-url')
      .then((res) => (res.ok ? res.json() : { configured: false, url: null }))
      .then((data) => {
        setConfigured(data.configured);
        setUrl(data.url);
      });
  }, []);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[210] bg-[#050810]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Rss className="w-4 h-4 text-emerald-400" /> Subscribe via iCal
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {configured === null && (
          <div className="flex items-center justify-center py-6 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {configured === false && (
          <div className="text-sm text-gray-400 space-y-2">
            <p>Feed isn&apos;t set up yet. Set a <code className="text-emerald-300">CALENDAR_FEED_TOKEN</code> environment variable (any long random string) and reload.</p>
          </div>
        )}

        {configured === true && url && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Paste this URL into Google Calendar (Other calendars → From URL), Apple Calendar (File → New Calendar Subscription), or Outlook (Add calendar → From internet).
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 font-mono"
              />
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
