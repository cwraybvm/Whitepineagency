# Voiceover Mock Fallback & Brand DNA URL Extraction — Design

## Context

A prior spec (`2026-08-03-sandbox-voiceover-design.md`) already implemented per-beat voiceover
generation in Video Lab via OpenAI TTS (`/api/sandbox/generate-voice`), including the "Generate
Scene Audio" button and inline `<audio>` preview in `VideoLabPanel.tsx`. That work is done. This
spec covers the two real gaps found when re-scoping the "capability upgrade" request:

1. `generate-voice` has no fallback when `OPENAI_API_KEY` is unset — it 500s instead of degrading
   gracefully, which breaks local dev (no key is configured in `.env.local`).
2. Brand DNA (`BrandDnaDrawer.tsx`) only supports manually typed brand voice/guidelines — there is
   no way to auto-extract brand info from a client's website.

ElevenLabs is explicitly out of scope — the existing OpenAI TTS integration stays as-is (already
decided in the prior spec).

## 1. Voiceover Mock Fallback

**Problem:** `synthesizeSpeech` in `src/lib/sandboxPrompts.ts` throws `OpenAiNotConfiguredError`
when `OPENAI_API_KEY` is missing. `POST /api/sandbox/generate-voice` lets that propagate to a 500,
so the "Generate Scene Audio" button just errors out in any environment without the key.

**Change:**
- `generate-voice/route.ts` catches `OpenAiNotConfiguredError` specifically (not other errors) and
  returns `200 { success: true, audioUrl: MOCK_AUDIO_DATA_URI, voiceId: 'mock', mock: true }`
  instead of a 500.
- `MOCK_AUDIO_DATA_URI` is a small embedded silent-WAV `data:` URI constant added next to
  `VOICE_PERSONAS` in `sandboxPrompts.ts`. No network call, no Vercel Blob upload for the mock path.
- `VideoLabPanel.tsx`: `generateBeatAudio` stores `data.mock` on the beat (`Beat` type gains
  `mock?: boolean`); when true, render a small "Mock (no API key)" badge next to that beat's
  `<audio>` element.

**Error handling:** All other failure modes (network error, malformed OpenAI response, Blob upload
failure) keep today's behavior — toast scoped to that beat, other beats unaffected.

## 2. Brand DNA URL Extraction

**New route:** `POST /api/sandbox/extract-brand`, body `{ url: string }`.

Steps:
1. **Validate the URL** before any fetch:
   - Must parse as a URL with protocol `http:` or `https:`.
   - Reject `localhost`, `127.0.0.1`, `::1`, and hostnames that are bare IP literals in private/
     link-local ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
   - This is an SSRF guard — the URL is user-supplied and fetched server-side, so it must not be
     usable to reach internal network services.
2. **Fetch** the page with an `AbortController` timeout (~8s) and a hard read cap (~300KB of body,
   stop reading past that). No headless browser / Playwright — plain `fetch`, matching every other
   sandbox route's dependency footprint.
3. **Extract text + colors:** strip `<script>`/`<style>` blocks, collapse remaining HTML tags to
   plain text (regex-based, no new HTML-parsing dependency). Separately regex-scan the raw HTML for
   hex colors (`#rrggbb`/`#rgb`) inside inline `style="..."` attributes and `<style>` blocks. External
   stylesheets are not followed (out of scope — keeps this dependency-free and fast).
4. **Summarize via LLM:** reuse `callOpenAiJson(systemPrompt, pageText, mockFallback)` from
   `sandboxPrompts.ts` — same helper every other generation endpoint uses, so the existing
   mock-fallback-when-no-key behavior is inherited for free. System prompt asks for JSON:
   `{ brandVoice: string, valueProp: string, targetAudience: string, accentColors: string[] }`
   (the model also gets the regex-extracted hex colors as a hint, and can pick the most likely
   brand accents from the candidate list plus its own read of the page).
5. **Response:** `{ brandVoice, brandGuidelines, accentColors }` where `brandGuidelines` is composed
   server-side as:
   ```
   Value Proposition: <valueProp>
   Target Audience: <targetAudience>

   <any existing brandGuidelines the client already had, left for the user to merge/edit>
   ```
   Composing this server-side keeps the client dumb — it just drops the returned strings into the
   existing textareas.

**UI (`BrandDnaDrawer.tsx`):**
- New URL input + "Extract from URL" button above the existing Brand Voice field, with its own
  loading state (`extracting`).
- On success: `setBrandVoice(data.brandVoice)`, `setBrandGuidelines(data.brandGuidelines)` — both
  remain plain editable textareas, nothing auto-saves. The user still clicks "Save Brand DNA".
- `accentColors` render as a row of clickable color swatches below the URL input. Clicking a swatch
  sets a new local `primaryColor` state (drawer gains this field, previously absent). `primaryColor`
  rides along in the existing Save POST body if set.
- `POST /api/sandbox/brand` (existing route) gains an optional `primaryColor` field in its body,
  written to `organization.primaryColor` (the column already exists, currently only settable
  elsewhere in admin org settings — this is an additional write path, not a new column).

**Error handling:**
- Invalid/blocked URL (bad protocol, private IP) → `400` with a clear message, no fetch attempted.
- Fetch timeout/network error/non-2xx → `502` with a message; drawer shows a toast, existing field
  values untouched.
- Oversized response → truncated at the read cap rather than rejected (best-effort extraction from
  whatever was read).

## Out of Scope

- Following external stylesheets/JS-rendered pages (no headless browser).
- Persisting `accentColors[]` as a list (only the single `primaryColor` column is written).
- Any provider other than OpenAI for the LLM summarization step.
- ElevenLabs or any other TTS provider (already decided out of scope in the prior voiceover spec).

## Testing

No test framework in this repo for these sandbox routes. Following the same pattern as the prior
voiceover spec: a small standalone script (`scratchpad`, not committed) that POSTs to
`/api/sandbox/extract-brand` with malformed/blocked inputs (`ftp://...`, `http://localhost/`,
`http://127.0.0.1/`, `http://192.168.1.1/`, missing `url`) and asserts each gets a `400`. Manual
verification in-browser for the success path (real URL → drawer fields populate) since live
scraping + LLM output isn't practical to assert against in an automated check.
