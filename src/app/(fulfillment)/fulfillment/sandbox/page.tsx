'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Sparkles,
  Wand2,
  Loader2,
  Music2,
  ArrowRight,
  // lucide-react ships no brand icons (no Linkedin/Instagram/Twitter) --
  // aliased to generic share icons, same workaround as ContentStudio.tsx.
  Share2 as Linkedin,
  Share2 as Instagram,
  Share2 as XformerlyTwitter,
} from 'lucide-react';
import ClientSelector, { ClientProvider, useClientSelector } from '@/components/ClientSelector';
import CopyButton from '@/components/sandbox/CopyButton';

type PlatformKey = 'linkedin' | 'twitter' | 'instagram' | 'tiktok';

interface GeneratedPack {
  linkedinPost: string;
  twitterThread: string[];
  instagramCaption: string;
  reelScript: string;
  postId: string | null;
}

const PRESETS: { key: PlatformKey; label: string; icon: React.ElementType; color: string; template: string }[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20',
    template: 'Write a professional, thought-leadership LinkedIn post about: ',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    icon: XformerlyTwitter,
    color: 'text-slate-300 border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20',
    template: 'Write a punchy, scroll-stopping Twitter/X thread about: ',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20',
    template: 'Write an engaging Instagram caption with emojis and hashtags about: ',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20',
    template: 'Write a hook-driven, fast-paced TikTok video script about: ',
  },
];

function PreviewCard({
  icon: Icon,
  label,
  color,
  content,
  organizationId,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  content: string;
  organizationId?: string;
}) {
  return (
    <div className="relative group bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${color}`}>
          <Icon className="w-4 h-4" /> {label}
        </span>
        <CopyButton text={content} />
      </div>
      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{content}</p>
      <Link
        href={organizationId ? `/fulfillment/studio?client=${organizationId}` : '/fulfillment/studio'}
        className="mt-auto flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl px-3 py-2"
      >
        Send to Client Studio <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function SandboxBody() {
  const { selectedClient, loading: clientsLoading } = useClientSelector();
  const [sourceNotes, setSourceNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  function applyPreset(template: string) {
    setSourceNotes(template);
  }

  async function handleGenerate() {
    if (!selectedClient) {
      toast.error('Select a client first');
      return;
    }
    if (!sourceNotes.trim()) {
      toast.error('Enter a topic or notes to generate from');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNotes: sourceNotes.trim(),
          clientName: selectedClient.name,
          organizationId: selectedClient.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setPack({
        linkedinPost: data.linkedinPost || '',
        twitterThread: Array.isArray(data.twitterThread) ? data.twitterThread : [],
        instagramCaption: data.instagramCaption || '',
        reelScript: data.reelScript || '',
        postId: data.postId || null,
      });
      toast.success(`Draft saved to ${selectedClient.name}'s Content Studio`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-6 pb-6 pt-[calc(max(24px,env(safe-area-inset-top))+8px)] md:px-8 md:pb-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> CREATIVE SANDBOX
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Multi-Channel Copy Generator</h1>
        </div>
        <ClientSelector />
      </div>

      {!clientsLoading && !selectedClient ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">
          No clients yet — add one under Admin → Clients first.
        </div>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.template)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${p.color}`}
                >
                  <p.icon className="w-3.5 h-3.5" /> {p.label}
                </button>
              ))}
            </div>
            <textarea
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              rows={4}
              placeholder="Pick a platform preset above or type a topic / notes to generate from..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate All Channels'}
            </button>
          </div>

          {pack && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PreviewCard icon={Linkedin} label="LinkedIn" color="text-sky-400" content={pack.linkedinPost} organizationId={selectedClient?.id} />
              <PreviewCard
                icon={XformerlyTwitter}
                label="Twitter / X"
                color="text-slate-300"
                content={pack.twitterThread.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}
                organizationId={selectedClient?.id}
              />
              <PreviewCard icon={Instagram} label="Instagram" color="text-pink-400" content={pack.instagramCaption} organizationId={selectedClient?.id} />
              <PreviewCard icon={Music2} label="TikTok" color="text-fuchsia-400" content={pack.reelScript} organizationId={selectedClient?.id} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SandboxPage() {
  return (
    <ClientProvider>
      <SandboxBody />
    </ClientProvider>
  );
}
