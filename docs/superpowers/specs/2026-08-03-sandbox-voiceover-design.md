# Sandbox Voiceover & Audio Synthesis — Design

## Goal
Let a user generate spoken voiceover audio for each scene beat in the Video Lab storyboard (`/sandbox`), preview it in-browser, and persist it alongside the rest of the storyboard data when saved.

## Architecture

New endpoint: `POST /api/sandbox/generate-voice`
- Request: `{ sceneText: string, voicePersona: 'Energetic' | 'Professional' | 'Warm', organizationId?: string }`
- Calls OpenAI's TTS endpoint (`gpt-4o-mini-tts`) via raw `fetch`, following the existing `callOpenAiJson` pattern in `src/lib/sandboxPrompts.ts` (no OpenAI SDK dependency).
- Uploads the returned audio buffer to Vercel Blob (`@vercel/blob`, `put()`), public access, path `sandbox-audio/<uuid>.mp3`.
- Response: `{ audioUrl: string, voiceId: string }`.

No new database table. Audio metadata is stored inline in the existing `CreativeAsset.metadata` JSON blob, on each beat object: `metadata.beats[i] = { scene, shot, line, duration, cameraMovement, voicePersona, voiceId, audioUrl, audioDuration }`.

## Persona Mapping

OpenAI TTS voices aren't named by persona, so persona selection maps to a single fixed voice (`onyx`) with different `instructions` text steering delivery style. This keeps voice identity consistent within a script even if different beats use different personas.

Defined in `src/lib/sandboxPrompts.ts`:
```ts
export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }> = {
  Energetic:    { voice: 'onyx', instructions: 'Deliver with upbeat, high energy, fast-paced enthusiasm.' },
  Professional: { voice: 'onyx', instructions: 'Deliver clear, confident, measured, corporate-neutral.' },
  Warm:         { voice: 'onyx', instructions: 'Deliver friendly, reassuring, at a relaxed conversational pace.' },
};
```

## Duration

OpenAI's TTS response contains no duration metadata, and parsing audio server-side would require a new dependency. Duration is instead measured client-side: once the `<audio>` element's `src` is set, its `loadedmetadata` event gives `audio.duration`, which is written into that beat's state.

`ponytail: client-measured duration only, move server-side (e.g. via a lightweight audio-duration lib) if a workflow ever needs duration before the browser has loaded the file`

## UI Changes (`src/components/sandbox/VideoLabPanel.tsx`)

Each beat card gains:
- A row of 3 persona buttons (Energetic / Professional / Warm), styled like the existing Duration/Camera button rows.
- A "Generate Scene Audio" button, per-beat loading state (keyed by beat index — one beat generating does not block others).
- Once `audioUrl` exists on that beat: an inline `<audio controls src={beat.audioUrl} onLoadedMetadata=... />` preview player.

`Beat` type (`src/components/sandbox/types.ts`) gains optional fields: `voicePersona?`, `voiceId?`, `audioUrl?`, `audioDuration?`.

No new save button — the existing "Save to Staged Assets" action already serializes `draft.metadata` (which includes `beats`), so audio fields persist automatically once generated.

## Error Handling

- TTS call failure (bad API response, network error): toast scoped to that specific beat via its per-beat loading/error state; other beats remain usable.
- Missing `OPENAI_API_KEY` or Blob write token: route returns 500 with a descriptive message, surfaced through the existing toast pattern in `VideoLabPanel.tsx`.

## Dependencies / Environment

- New package: `@vercel/blob`.
- New required env var: `BLOB_READ_WRITE_TOKEN` (Vercel Blob store token). This must be provisioned in the Vercel project's storage settings and added to `.env.local` for local dev — not something this change can create on its own; local dev without the token will fail generation requests with a clear error.
- Reuses existing `OPENAI_API_KEY` (already used by `src/lib/sandboxPrompts.ts`).

## Testing

Live TTS calls aren't practical to unit test. The runnable check is the route's own input validation: a small standalone script that POSTs malformed bodies (missing `sceneText`, invalid `voicePersona`) to the route handler and asserts 400 responses — no test framework, no fixtures.

## Out of Scope

- Full-script (all-beats-at-once) audio generation/concatenation.
- Waveform visualization.
- Any TTS provider other than OpenAI (ElevenLabs explicitly deferred per user decision).
