# Sandbox Voiceover & Audio Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user generate OpenAI-synthesized voiceover audio for each scene beat in the Video Lab storyboard (`/sandbox`), preview it in-browser, and have it persist with the rest of the storyboard on save.

**Architecture:** A new `POST /api/sandbox/generate-voice` route calls OpenAI's TTS endpoint and uploads the resulting audio to Vercel Blob, returning a public URL. `VideoLabPanel.tsx` gets a per-beat persona selector, generate button, and inline `<audio>` player; generated audio fields ride inside the existing `CreativeAsset.metadata.beats[i]` JSON blob with no new DB table and no new save action.

**Tech Stack:** Next.js App Router route handlers, OpenAI Audio API (`gpt-4o-mini-tts`) via raw `fetch`, `@vercel/blob` for storage, React/TypeScript, `tsx` for standalone script execution.

## Global Constraints

- No OpenAI SDK — use raw `fetch`, matching the existing pattern in `src/lib/sandboxPrompts.ts`.
- No new database table — audio metadata lives inline in `CreativeAsset.metadata.beats[i]`.
- Single fixed voice (`onyx`) across all personas — persona only changes TTS `instructions`, per approved design.
- Duration is measured client-side via the `<audio>` `loadedmetadata` event — no server-side audio parsing dependency.
- New required env var `BLOB_READ_WRITE_TOKEN` must be provisioned by the user in Vercel project settings / `.env.local` — this plan cannot create it.
- Reuses existing `OPENAI_API_KEY` env var already used by `sandboxPrompts.ts`.

---

### Task 1: Voice persona config, validation, and TTS helper

**Files:**
- Modify: `package.json` (add `@vercel/blob` dependency)
- Modify: `src/lib/sandboxPrompts.ts` (add `VOICE_PERSONAS`, `validateVoiceGenInput`, `synthesizeSpeech`)
- Create: `scripts/test-generate-voice-validation.ts`

**Interfaces:**
- Produces: `export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }>`
- Produces: `export function validateVoiceGenInput(body: any): string | null` — returns an error message string if invalid, `null` if valid.
- Produces: `export async function synthesizeSpeech(text: string, persona: keyof typeof VOICE_PERSONAS): Promise<Buffer>` — throws on API failure.

- [ ] **Step 1: Install `@vercel/blob`**

Run: `npm install @vercel/blob`

- [ ] **Step 2: Add `VOICE_PERSONAS` and `validateVoiceGenInput` to `src/lib/sandboxPrompts.ts`**

Append to `src/lib/sandboxPrompts.ts`:

```ts
export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }> = {
  Energetic: { voice: 'onyx', instructions: 'Deliver with upbeat, high energy, fast-paced enthusiasm.' },
  Professional: { voice: 'onyx', instructions: 'Deliver clear, confident, measured, corporate-neutral.' },
  Warm: { voice: 'onyx', instructions: 'Deliver friendly, reassuring, at a relaxed conversational pace.' },
};

export function validateVoiceGenInput(body: any): string | null {
  if (typeof body?.sceneText !== 'string' || !body.sceneText.trim()) {
    return 'sceneText is required';
  }
  if (!VOICE_PERSONAS[body?.voicePersona as keyof typeof VOICE_PERSONAS]) {
    return `voicePersona must be one of ${Object.keys(VOICE_PERSONAS).join(', ')}`;
  }
  return null;
}
```

- [ ] **Step 3: Write the failing validation test**

Create `scripts/test-generate-voice-validation.ts`:

```ts
import { validateVoiceGenInput } from '../src/lib/sandboxPrompts';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { sceneText: '' }, expectError: true },
  { body: { sceneText: '   ' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'Bogus' }, expectError: true },
  { body: { sceneText: 'Hello' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'Warm' }, expectError: false },
  { body: { sceneText: 'Hello', voicePersona: 'Energetic' }, expectError: false },
  { body: { sceneText: 'Hello', voicePersona: 'Professional' }, expectError: false },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateVoiceGenInput(body);
  const got = error !== null;
  if (got !== expectError) {
    failures++;
    console.error(`FAIL: ${JSON.stringify(body)} -> expected error=${expectError}, got=${got} (${error})`);
  }
}
if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('All validation cases passed');
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx tsx scripts/test-generate-voice-validation.ts`
Expected: FAIL — `validateVoiceGenInput` does not exist yet (module has no exported member), since Step 2 and Step 3 are written together above; to genuinely see this fail first, comment out the Step 2 addition, run the script (expect a TypeScript import error), then paste Step 2 back in before Step 5.

- [ ] **Step 5: Run it to verify it passes**

Run: `npx tsx scripts/test-generate-voice-validation.ts`
Expected: `All validation cases passed`

- [ ] **Step 6: Add `synthesizeSpeech` to `src/lib/sandboxPrompts.ts`**

Append to `src/lib/sandboxPrompts.ts`:

```ts
export async function synthesizeSpeech(text: string, persona: keyof typeof VOICE_PERSONAS): Promise<Buffer> {
  const { voice, instructions } = VOICE_PERSONAS[persona];
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || 'OpenAI TTS request failed');
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

This has no standalone test (live external API call) — it is exercised end-to-end in Task 2's manual verification.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/sandboxPrompts.ts scripts/test-generate-voice-validation.ts
git commit -m "feat: add voice persona config and TTS helper for sandbox voiceover"
```

---

### Task 2: Voiceover generation API route

**Files:**
- Create: `src/app/api/sandbox/generate-voice/route.ts`

**Interfaces:**
- Consumes: `validateVoiceGenInput(body: any): string | null`, `synthesizeSpeech(text: string, persona: keyof typeof VOICE_PERSONAS): Promise<Buffer>`, `VOICE_PERSONAS` from `@/lib/sandboxPrompts` (Task 1).
- Produces: `POST /api/sandbox/generate-voice` — request body `{ sceneText: string, voicePersona: 'Energetic' | 'Professional' | 'Warm' }`; success response `{ success: true, audioUrl: string, voiceId: string }` (200); error response `{ error: string }` (400 for invalid input, 500 for upstream/upload failure). Task 4 (UI) consumes this shape directly.

- [ ] **Step 1: Write the route handler**

Create `src/app/api/sandbox/generate-voice/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { validateVoiceGenInput, synthesizeSpeech, VOICE_PERSONAS } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationError = validateVoiceGenInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { sceneText, voicePersona } = body as { sceneText: string; voicePersona: keyof typeof VOICE_PERSONAS };

    const audioBuffer = await synthesizeSpeech(sceneText, voicePersona);
    const blob = await put(`sandbox-audio/${randomUUID()}.mp3`, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      voiceId: VOICE_PERSONAS[voicePersona].voice,
    });
  } catch (err: any) {
    console.error('Sandbox generate-voice error:', err);
    return NextResponse.json({ error: err.message || 'Voice generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify validation path (no live API call needed)**

With the dev server running (`npm run dev`), run:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/generate-voice -H "Content-Type: application/json" -d "{}"
```

Expected: `{"error":"sceneText is required"}` with a 400 status — confirms routing and validation wiring without needing `OPENAI_API_KEY`/`BLOB_READ_WRITE_TOKEN` to be set yet.

- [ ] **Step 3: Manual end-to-end verification (requires `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN` set)**

```bash
curl -s -X POST http://localhost:3000/api/sandbox/generate-voice -H "Content-Type: application/json" -d "{\"sceneText\":\"Your roof, done right, guaranteed.\",\"voicePersona\":\"Warm\"}"
```

Expected: `{"success":true,"audioUrl":"https://...blob.vercel-storage.com/sandbox-audio/....mp3","voiceId":"onyx"}`. Open the `audioUrl` in a browser to confirm playable audio. If `BLOB_READ_WRITE_TOKEN` is not yet set in `.env.local`, this step returns a 500 with a message about the missing token — expected until the user provisions it (see plan's Global Constraints).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sandbox/generate-voice/route.ts
git commit -m "feat: add /api/sandbox/generate-voice route"
```

---

### Task 3: Extend `Beat` type with audio fields

**Files:**
- Modify: `src/components/sandbox/types.ts:76-82`

**Interfaces:**
- Produces: `Beat` type gains `voicePersona?: 'Energetic' | 'Professional' | 'Warm'`, `voiceId?: string`, `audioUrl?: string`, `audioDuration?: number`. Task 4 depends on these exact field names.

- [ ] **Step 1: Update the `Beat` type**

In `src/components/sandbox/types.ts`, replace:

```ts
export type Beat = {
  scene: string;
  shot: string;
  line: string;
  duration?: ShotDuration;
  cameraMovement?: CameraMovement;
};
```

with:

```ts
export const VOICE_PERSONA_OPTIONS = ['Energetic', 'Professional', 'Warm'] as const;
export type VoicePersona = (typeof VOICE_PERSONA_OPTIONS)[number];

export type Beat = {
  scene: string;
  shot: string;
  line: string;
  duration?: ShotDuration;
  cameraMovement?: CameraMovement;
  voicePersona?: VoicePersona;
  voiceId?: string;
  audioUrl?: string;
  audioDuration?: number;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (existing `Beat` consumers only read fields that still exist; new fields are optional).

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/types.ts
git commit -m "feat: add voice persona and audio fields to Beat type"
```

---

### Task 4: Voiceover UI in `VideoLabPanel.tsx`

**Files:**
- Modify: `src/components/sandbox/VideoLabPanel.tsx`

**Interfaces:**
- Consumes: `POST /api/sandbox/generate-voice` (Task 2), `VOICE_PERSONA_OPTIONS`, `VoicePersona`, updated `Beat` type (Task 3).

- [ ] **Step 1: Import the new type/constant and add per-beat audio-generation loading state**

In `src/components/sandbox/VideoLabPanel.tsx`, update the import line:

```ts
import { TONE_OPTIONS, SHOT_DURATIONS, CAMERA_MOVEMENTS, VOICE_PERSONA_OPTIONS, type Tone, type Beat, type ShotDuration, type CameraMovement, type VoicePersona } from './types';
```

Add a new icon import alongside the existing `lucide-react` import:

```ts
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic } from 'lucide-react';
```

Inside the `VideoLabPanel` component, alongside the existing `useState` calls, add:

```ts
const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({});
```

- [ ] **Step 2: Add a `generateBeatAudio` handler**

Add this function inside `VideoLabPanel`, near `updateBeat`:

```ts
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
    updateBeat(index, { voicePersona: persona, voiceId: data.voiceId, audioUrl: data.audioUrl });
  } catch (err: any) {
    toast.error(err.message || 'Failed to generate scene audio');
  } finally {
    setGeneratingAudio((prev) => ({ ...prev, [index]: false }));
  }
};
```

- [ ] **Step 3: Add the persona selector, generate button, and audio player to each beat card**

In the beat-card JSX, inside the `pl-7` flex-wrap div that already holds the Duration and Camera controls, add a third control group right after the Camera one (still inside the same `<div className="flex flex-wrap gap-4 pl-7">`):

```tsx
<div className="space-y-1">
  <label className="text-[9px] text-slate-500 font-mono uppercase block">Voice Persona</label>
  <div className="flex gap-1">
    {VOICE_PERSONA_OPTIONS.map((p) => (
      <button
        key={p}
        onClick={() => updateBeat(i, { voicePersona: p as VoicePersona })}
        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
          (beat.voicePersona || 'Professional') === p ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        {p}
      </button>
    ))}
  </div>
</div>
```

Then, immediately after that same `flex flex-wrap gap-4 pl-7` div closes (still inside the beat card, before its closing `</div>`), add:

```tsx
<div className="pl-7 space-y-2">
  <button
    onClick={() => generateBeatAudio(i)}
    disabled={generatingAudio[i]}
    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1.5"
  >
    {generatingAudio[i] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
    {generatingAudio[i] ? 'Generating…' : 'Generate Scene Audio'}
  </button>
  {beat.audioUrl && (
    <audio
      controls
      src={beat.audioUrl}
      className="w-full h-8"
      onLoadedMetadata={(e) => updateBeat(i, { audioDuration: e.currentTarget.duration })}
    />
  )}
</div>
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open `/sandbox`, generate a storyboard, pick a persona on a beat, click "Generate Scene Audio", confirm the button shows a spinner then an `<audio>` player appears and plays. Click "Save to Staged Assets" and confirm (via the Staged Assets list or a DB check) that the saved `metadata.beats[i]` includes `voicePersona`, `voiceId`, `audioUrl`, and `audioDuration`.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/VideoLabPanel.tsx
git commit -m "feat: add voiceover generation UI to Video Lab beats"
```
