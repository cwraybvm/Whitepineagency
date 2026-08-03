'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Clapperboard, Copy, Download } from 'lucide-react';
import { TONE_OPTIONS, SHOT_DURATIONS, CAMERA_MOVEMENTS, type Tone, type Beat, type ShotDuration, type CameraMovement } from './types';
import ScoreBadge from './ScoreBadge';

type VideoDraft = {
  title: string;
  content: string;
  metadata: { beats: Beat[] };
};

function shotPromptsText(title: string, beats: Beat[]): string {
  return [
    `SHOT-BY-SHOT PROMPTS — ${title}`,
    `(Formatted for text-to-video tools: Runway, Sora, Pika. Visual prompt per shot; voiceover is reference only — these tools don't take audio input.)`,
    '',
    ...beats.map((beat, i) => [
      `SHOT ${i + 1} — ${beat.scene}`,
      `Duration: ${beat.duration || '3s'}`,
      `Camera: ${beat.cameraMovement || 'Static'}`,
      `Prompt: ${beat.shot}`,
      `Voiceover (reference only, not part of the video prompt): "${beat.line}"`,
      '',
    ].join('\n')),
  ].join('\n');
}

export default function VideoLabPanel() {
  const [prompt, setPrompt] = useState('15-second social ad for a plumbing company\'s emergency service');
  const [tone, setTone] = useState<Tone>('Urgent');
  const [lengthSeconds, setLengthSeconds] = useState(15);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<VideoDraft | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'video', prompt, tone, lengthSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const beats: Beat[] = (data.metadata.beats || []).map((b: Beat) => ({
        ...b,
        duration: b.duration || '3s',
        cameraMovement: b.cameraMovement || 'Static',
      }));
      setDraft({ title: data.title, content: data.content, metadata: { beats } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const updateBeat = (index: number, patch: Partial<Beat>) => {
    if (!draft) return;
    const beats = [...draft.metadata.beats];
    beats[index] = { ...beats[index], ...patch };
    setDraft({ ...draft, metadata: { beats } });
  };

  const applyOptimized = (title: string | undefined, content: string, metadata: any) => {
    if (!draft) return;
    // Keep the director's own duration/camera picks where the refined beat
    // count still lines up; new beats past the old length fall back to defaults.
    const refinedBeats: Beat[] = (metadata?.beats || draft.metadata.beats).map((b: Beat, i: number) => ({
      ...b,
      duration: draft.metadata.beats[i]?.duration || b.duration || '3s',
      cameraMovement: draft.metadata.beats[i]?.cameraMovement || b.cameraMovement || 'Static',
    }));
    setDraft({ title: title || draft.title, content, metadata: { beats: refinedBeats } });
  };

  const saveToStaged = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sandbox/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          type: 'VIDEO_SCRIPT',
          content: draft.content,
          metadata: { ...draft.metadata, tone, lengthSeconds },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const copyShotPrompts = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(shotPromptsText(draft.title, draft.metadata.beats));
      toast.success('Shot-by-shot prompts copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadShotPrompts = () => {
    if (!draft) return;
    const blob = new Blob([shotPromptsText(draft.title, draft.metadata.beats)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.title.replace(/\s+/g, '-').toLowerCase()}-shot-prompts.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Video Lab Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Brief</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Target Length (seconds)</label>
          <input
            type="number"
            value={lengthSeconds}
            onChange={(e) => setLengthSeconds(Number(e.target.value))}
            min={5}
            max={60}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`w-full py-2 rounded-lg text-xs font-bold text-left px-3 transition-all ${
                  tone === t
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating || !prompt}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Storyboard'}
        </button>
      </div>

      {/* RIGHT: Scene-by-scene storyboard */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex flex-col">
        {draft ? (
          <div className="flex-1 flex flex-col space-y-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase">{draft.title}</span>
            <div className="space-y-3">
              {draft.metadata.beats?.map((beat, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex gap-3">
                    <Clapperboard className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-bold text-white">{beat.scene}</p>
                      <p className="text-[11px] text-slate-500 italic">{beat.shot}</p>
                      <p className="text-sm text-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono uppercase mr-1">VO/Audio:</span>
                        {beat.line}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pl-7">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-mono uppercase block">Duration</label>
                      <div className="flex gap-1">
                        {SHOT_DURATIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => updateBeat(i, { duration: d as ShotDuration })}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              beat.duration === d ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-mono uppercase block">Camera</label>
                      <div className="flex gap-1">
                        {CAMERA_MOVEMENTS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateBeat(i, { cameraMovement: c as CameraMovement })}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              beat.cameraMovement === c ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScoreBadge
              content={draft.content}
              type="VIDEO_SCRIPT"
              metadata={draft.metadata}
              onOptimized={(r) => applyOptimized(r.title, r.content, r.metadata)}
            />
            <div className="pt-4 border-t border-slate-800 mt-auto space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={copyShotPrompts}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Shot Prompts
                </button>
                <button
                  onClick={downloadShotPrompts}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
              <button
                onClick={saveToStaged}
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save to Staged Assets'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm">
            Set your brief and length, then generate to see the storyboard here.
          </div>
        )}
      </div>
    </div>
  );
}
