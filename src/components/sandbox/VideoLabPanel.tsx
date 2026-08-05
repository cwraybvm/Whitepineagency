'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic, RefreshCw, History as HistoryIcon } from 'lucide-react';
import { TONE_OPTIONS, SHOT_DURATIONS, CAMERA_MOVEMENTS, VOICE_PERSONA_OPTIONS, type Tone, type Beat, type ShotDuration, type CameraMovement, type VoicePersona } from './types';
import ScoreBadge from './ScoreBadge';
import CopyButton from './CopyButton';
import HistoryDrawer from './HistoryDrawer';
import { fetchGenerationJson } from '@/lib/sandboxClientFetch';
import { useSandboxHistory } from '@/hooks/useSandboxHistory';

type VideoDraft = {
  title: string;
  content: string;
  metadata: { beats: Beat[] };
};

type VideoLabSnapshot = {
  prompt: string;
  tone: Tone;
  lengthSeconds: number;
  draft: VideoDraft | null;
};

function formatTimecode(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function beatDurationSeconds(beat: Beat): number {
  return parseInt(beat.duration || '3s', 10) || 3;
}

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
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<VideoDraft | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({});

  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useSandboxHistory<VideoLabSnapshot>('video', null);

  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'video', prompt, tone, lengthSeconds }),
      });
      const beats: Beat[] = (data.metadata.beats || []).map((b: Beat) => ({
        ...b,
        duration: b.duration || '3s',
        cameraMovement: b.cameraMovement || 'Static',
      }));
      const newDraft = { title: data.title, content: data.content, metadata: { beats } };
      setDraft(newDraft);
      history.add(`${lengthSeconds}s — ${prompt.slice(0, 60)}`, { prompt, tone, lengthSeconds, draft: newDraft });
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const restoreFromHistory = (snapshot: VideoLabSnapshot) => {
    setPrompt(snapshot.prompt);
    setTone(snapshot.tone);
    setLengthSeconds(snapshot.lengthSeconds);
    setDraft(snapshot.draft);
  };

  const updateBeat = (index: number, patch: Partial<Beat>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const beats = [...prev.metadata.beats];
      beats[index] = { ...beats[index], ...patch };
      return { ...prev, metadata: { beats } };
    });
  };

  const generateBeatAudio = async (index: number) => {
    if (!draft) return;
    const beat = draft.metadata.beats[index];
    const persona = beat.voicePersona || 'Professional';
    setGeneratingAudio((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch('/api/sandbox/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneText: beat.line, voicePersona: persona }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice generation failed');
      updateBeat(index, { voicePersona: persona, voiceId: data.voiceId, audioUrl: data.audioUrl, mock: data.mock });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate scene audio');
    } finally {
      setGeneratingAudio((prev) => ({ ...prev, [index]: false }));
    }
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
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Video Lab Controls</h2>
          <button
            onClick={() => setHistoryOpen(true)}
            className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            title="Generation history"
          >
            <HistoryIcon className="w-4 h-4" />
            {history.items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {history.items.length}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Brief</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Target Length (seconds)</label>
          <input
            type="number"
            value={lengthSeconds}
            onChange={(e) => setLengthSeconds(Number(e.target.value))}
            min={5}
            max={60}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`w-full py-2 rounded-lg text-xs font-bold text-left px-3 transition-all ${
                  tone === t
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Storyboard'}
        </button>
      </div>

      {/* RIGHT: Scene-by-scene storyboard */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex flex-col">
        {draft ? (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">{draft.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  Scene 1 of {draft.metadata.beats.length}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 rounded-full px-2 py-0.5">
                  {draft.metadata.beats.reduce((sum, b) => sum + beatDurationSeconds(b), 0)}s Total
                </span>
              </div>
            </div>
            <div className="relative space-y-4 pl-6 border-l-2 border-emerald-500/25 dark:border-emerald-500/20">
              {(() => {
                let elapsed = 0;
                return draft.metadata.beats?.map((beat, i) => {
                  const start = elapsed;
                  elapsed += beatDurationSeconds(beat);
                  const end = elapsed;
                  return (
                <div key={i} className="relative group bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="absolute -left-[31px] top-4 w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-emerald-900/20">
                    {i + 1}
                  </span>
                  <CopyButton text={`Scene ${i + 1}: ${beat.scene}\nVisual: ${beat.shot}\nVoiceover: ${beat.line}`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                      Scene {i + 1} of {draft.metadata.beats.length}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 rounded-full px-2 py-0.5">
                      {formatTimecode(start)} - {formatTimecode(end)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{beat.scene}</p>
                  <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase flex items-center gap-1">
                      <Clapperboard className="w-3 h-3 text-sky-400" /> Visual Cue
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">{beat.shot}</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase flex items-center gap-1">
                      <Mic className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Voiceover
                    </span>
                    <p className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">{beat.line}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase block">Duration</label>
                      <div className="flex gap-1">
                        {SHOT_DURATIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => updateBeat(i, { duration: d as ShotDuration })}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              beat.duration === d ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase block">Camera</label>
                      <div className="flex gap-1">
                        {CAMERA_MOVEMENTS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateBeat(i, { cameraMovement: c as CameraMovement })}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              beat.cameraMovement === c ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase block">Voice Persona</label>
                      <div className="flex gap-1">
                        {VOICE_PERSONA_OPTIONS.map((p) => (
                          <button
                            key={p}
                            onClick={() => updateBeat(i, { voicePersona: p as VoicePersona })}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              (beat.voicePersona || 'Professional') === p ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => generateBeatAudio(i)}
                      disabled={generatingAudio[i]}
                      className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-900 disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1.5"
                    >
                      {generatingAudio[i] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                      {generatingAudio[i] ? 'Generating…' : 'Generate Scene Audio'}
                    </button>
                    {beat.audioUrl && (
                      <div className="space-y-1">
                        {beat.mock && (
                          <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                            Mock (no API key)
                          </span>
                        )}
                        <audio
                          controls
                          src={beat.audioUrl}
                          className="w-full h-8"
                          onLoadedMetadata={(e) => updateBeat(i, { audioDuration: e.currentTarget.duration })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                  );
                });
              })()}
            </div>
            <ScoreBadge
              content={draft.content}
              type="VIDEO_SCRIPT"
              metadata={draft.metadata}
              onOptimized={(r) => applyOptimized(r.title, r.content, r.metadata)}
            />
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={copyShotPrompts}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Shot Prompts
                </button>
                <button
                  onClick={downloadShotPrompts}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
              <button
                onClick={saveToStaged}
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save to Staged Assets'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? (
              <>
                <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
                <button
                  onClick={generate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </>
            ) : (
              'Set your brief and length, then generate to see the storyboard here.'
            )}
          </div>
        )}
      </div>

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history.items}
        onRestore={restoreFromHistory}
        onClear={history.clear}
      />
    </div>
  );
}
