# Voiceover Mock Fallback & Brand DNA URL Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Video Lab's voiceover button degrade to a mock audio player instead of erroring when `OPENAI_API_KEY` is unset, and let Brand DNA be auto-populated by scraping+summarizing a client's website URL.

**Architecture:** Two independent, small additions to the existing Creative Sandbox (`/sandbox`). (1) `generate-voice` route catches the existing `OpenAiNotConfiguredError` and returns a locally-generated silent-WAV data URI instead of a 500. (2) A new `extract-brand` route validates a user-supplied URL (SSRF guard), fetches it with a timeout/size cap, uses `cheerio` (already a dependency) to pull plain text + candidate hex colors, and summarizes via the existing `callOpenAiJson` helper — same mock-fallback pattern every other sandbox route already uses.

**Tech Stack:** Next.js App Router route handlers, `cheerio` (already installed), existing `sandboxPrompts.ts` OpenAI helpers, no new dependencies.

## Global Constraints

- No new npm dependencies — `cheerio` is already installed and used elsewhere (`src/app/api/audit/route.ts`).
- No Prisma schema migration — reuse `Organization.primaryColor`, `brandVoice`, `brandGuidelines` as-is.
- No headless browser / JS rendering for the scraper.
- ElevenLabs and any TTS provider other than OpenAI stay out of scope.
- SSRF guard blocks non-`http(s)` protocols and IP-literal private/loopback/link-local addresses (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `localhost`). DNS-rebinding via a public hostname resolving to a private IP is a known, documented residual risk (`ponytail` comment in code) — out of scope for this pass.
- Fetch timeout: 8s. Fetch read cap: ~300KB. Text sent to the LLM capped at 8000 chars.
- Every generation-style route continues the existing `{ error: string }` JSON shape on failure and `{ success: true, ...}` on success, matching every other route in `src/app/api/sandbox/`.

---

### Task 1: Voiceover mock fallback (backend)

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (add `MOCK_AUDIO_DATA_URI` near `VOICE_PERSONAS`)
- Modify: `src/app/api/sandbox/generate-voice/route.ts`

**Interfaces:**
- Produces: `MOCK_AUDIO_DATA_URI: string` (exported constant, a `data:audio/wav;base64,...` URI), importable from `@/lib/sandboxPrompts`.
- Consumes: existing `OpenAiNotConfiguredError` class (already exported from `sandboxPrompts.ts`).

- [ ] **Step 1: Add the mock audio constant**

In `src/lib/sandboxPrompts.ts`, add near `VOICE_PERSONAS` (after the `synthesizeSpeech` function, e.g. line ~196):

```ts
// A locally-built silent WAV, base64-encoded as a data URI — used as the
// "Generate Scene Audio" response when OPENAI_API_KEY is unset, so the
// button and <audio> player degrade gracefully instead of 500ing.
function buildSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = 0;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

export const MOCK_AUDIO_DATA_URI = buildSilentWavDataUri();
```

- [ ] **Step 2: Catch the missing-key error in the route**

Replace the contents of `src/app/api/sandbox/generate-voice/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import {
  validateVoiceGenInput,
  synthesizeSpeech,
  VOICE_PERSONAS,
  OpenAiNotConfiguredError,
  MOCK_AUDIO_DATA_URI,
} from '@/lib/sandboxPrompts';

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
    if (err instanceof OpenAiNotConfiguredError) {
      return NextResponse.json({ success: true, audioUrl: MOCK_AUDIO_DATA_URI, voiceId: 'mock', mock: true });
    }
    console.error('Sandbox generate-voice error:', err);
    return NextResponse.json({ error: err.message || 'Voice generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify against the running dev server**

`OPENAI_API_KEY` is already unset in `.env.local`, so this is directly testable. Run:

```bash
npm run dev
```

In another terminal:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/generate-voice \
  -H "Content-Type: application/json" \
  -d '{"sceneText":"Hello there","voicePersona":"Professional"}'
```

Expected: JSON body with `"success":true`, `"mock":true`, and `"audioUrl":"data:audio/wav;base64,..."` — not a 500.

Also verify validation still 400s:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/generate-voice \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `{"error":"sceneText is required"}` with status 400.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sandboxPrompts.ts src/app/api/sandbox/generate-voice/route.ts
git commit -m "feat: fall back to mock audio when OPENAI_API_KEY is unset"
```

---

### Task 2: Voiceover mock fallback (frontend badge)

**Files:**
- Modify: `src/components/sandbox/types.ts` (`Beat` type)
- Modify: `src/components/sandbox/VideoLabPanel.tsx`

**Interfaces:**
- Consumes: `data.mock` boolean from the `/api/sandbox/generate-voice` response (Task 1).
- Produces: `Beat.mock?: boolean` field, consumed by `saveToStaged` (already serializes the whole `metadata.beats` array, no change needed there).

- [ ] **Step 1: Add `mock` to the `Beat` type**

In `src/components/sandbox/types.ts`, update the `Beat` type (around line 79):

```ts
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
  mock?: boolean;
};
```

- [ ] **Step 2: Store `mock` on the beat**

In `src/components/sandbox/VideoLabPanel.tsx`, in `generateBeatAudio` (around line 96), change:

```ts
      updateBeat(index, { voicePersona: persona, voiceId: data.voiceId, audioUrl: data.audioUrl });
```

to:

```ts
      updateBeat(index, { voicePersona: persona, voiceId: data.voiceId, audioUrl: data.audioUrl, mock: data.mock });
```

- [ ] **Step 3: Render the mock badge**

In the same file, find the block that renders the audio player (around lines 326-333):

```tsx
                    {beat.audioUrl && (
                      <audio
                        controls
                        src={beat.audioUrl}
                        className="w-full h-8"
                        onLoadedMetadata={(e) => updateBeat(i, { audioDuration: e.currentTarget.duration })}
                      />
                    )}
```

Replace with:

```tsx
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
```

- [ ] **Step 4: Verify in browser**

With the dev server running and no `OPENAI_API_KEY` set, go to `/sandbox` → Video Lab, generate a storyboard, click "Generate Scene Audio" on any beat. Confirm the "Mock (no API key)" badge appears above a working (silent) audio player with a scrubber.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/types.ts src/components/sandbox/VideoLabPanel.tsx
git commit -m "feat: show mock badge on voiceover preview when no API key is set"
```

---

### Task 3: Brand extraction — validation, prompt, and mock (lib)

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (add `validateExtractBrandUrl`, `BRAND_EXTRACT_PROMPT`, `mockBrandExtraction`)

**Interfaces:**
- Produces:
  - `validateExtractBrandUrl(url: unknown): string | null` — returns an error message or `null` if valid.
  - `BRAND_EXTRACT_PROMPT: string`
  - `mockBrandExtraction(url: string): { brandVoice: string; valueProp: string; targetAudience: string; accentColors: string[] }`

- [ ] **Step 1: Write a standalone verification script (run before implementing, expect failure)**

Create `verify-extract-url.ts` at the repo root (untracked scratch file, same pattern as the existing untracked `load-env.ts` — deleted in Task 8):

```ts
import { validateExtractBrandUrl } from './src/lib/sandboxPrompts';

const cases: [string, boolean][] = [
  ['https://example.com', true],
  ['http://example.com', true],
  ['ftp://example.com', false],
  ['not-a-url', false],
  ['http://localhost/', false],
  ['http://127.0.0.1/', false],
  ['http://10.0.0.5/', false],
  ['http://172.16.0.1/', false],
  ['http://192.168.1.1/', false],
  ['http://169.254.1.1/', false],
  ['', false],
];

let failed = 0;
for (const [url, shouldPass] of cases) {
  const result = validateExtractBrandUrl(url);
  const passed = result === null;
  if (passed !== shouldPass) {
    console.error(`FAIL: ${JSON.stringify(url)} expected pass=${shouldPass}, got pass=${passed} (${result})`);
    failed++;
  } else {
    console.log(`ok: ${JSON.stringify(url)} -> ${result ?? 'valid'}`);
  }
}
if (failed) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
console.log('All cases passed');
```

Run from the repo root with:

```bash
npx tsx verify-extract-url.ts
```

Expected: fails to even compile/import — `validateExtractBrandUrl` doesn't exist yet.

- [ ] **Step 2: Implement in `sandboxPrompts.ts`**

Add near the other `validate*` functions (after `validateLandingPageInput`, end of file):

```ts
const PRIVATE_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIpLiteral(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  return false;
}

// ponytail: blocks IP-literal private/loopback targets only. A public
// hostname that DNS-resolves to a private IP (rebinding) still passes —
// add a dns.lookup() + re-check on the resolved address if this route is
// ever exposed beyond trusted admin users.
export function validateExtractBrandUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return 'url is required';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'url is not a valid URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'url must use http or https';
  }
  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(hostname) || isPrivateIpLiteral(hostname)) {
    return 'url may not target a local or private address';
  }
  return null;
}

export const BRAND_EXTRACT_PROMPT =
  'You are an expert brand strategist analyzing a business website to extract its brand identity for a marketing agency. ' +
  "Given the page's visible text and a list of candidate accent colors found in its CSS, infer the brand. " +
  'Return a valid JSON object matching this structure exactly: {"brandVoice": "a short tone label, e.g. \'Confident, no-fluff, blue-collar friendly\'", "valueProp": "one sentence describing what makes this business worth choosing", "targetAudience": "one sentence describing who this business serves", "accentColors": ["up to 3 hex colors, chosen from the candidates when they look like real brand colors, otherwise your best guess"]}.';

export function mockBrandExtraction(url: string): any {
  return {
    brandVoice: '[MOCK] Confident, no-fluff, customer-first',
    valueProp: `[MOCK — set OPENAI_API_KEY for real output] Fast, reliable service from the team behind ${url}.`,
    targetAudience: '[MOCK] Local homeowners who want a trustworthy provider.',
    accentColors: ['#2563eb', '#f59e0b'],
  };
}
```

- [ ] **Step 3: Run the verification script again, expect pass**

Same `npx tsx` command as Step 1. Expected: `All cases passed`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add SSRF-guarded URL validator and brand-extraction prompt/mock"
```

---

### Task 4: HTML text/color extraction helper

**Files:**
- Create: `src/lib/htmlExtract.ts`

**Interfaces:**
- Produces:
  - `stripToPlainText(html: string): string`
  - `extractHexColors(html: string): string[]` (lowercased, deduped, excludes pure black/white, max 12)
  - `MAX_EXTRACT_CHARS: number` (constant, `8000`)

- [ ] **Step 1: Write a standalone verification script**

Create `verify-html-extract.ts` at the repo root (same untracked-scratch pattern as Task 3, deleted in Task 8):

```ts
import { stripToPlainText, extractHexColors } from './src/lib/htmlExtract';

const html = `
  <html><head><style>.hero { color: #2563EB; background: #fff; }</style></head>
  <body>
    <script>var x = "#000000";</script>
    <h1 style="color:#F59E0B">Welcome to Acme</h1>
    <p>We fix things fast.</p>
  </body></html>
`;

const text = stripToPlainText(html);
if (!text.includes('Welcome to Acme') || !text.includes('We fix things fast') || text.includes('var x')) {
  console.error('FAIL: stripToPlainText', text);
  process.exit(1);
}

const colors = extractHexColors(html);
const expected = ['#2563eb', '#f59e0b'];
if (colors.length !== expected.length || !expected.every((c) => colors.includes(c))) {
  console.error('FAIL: extractHexColors', colors);
  process.exit(1);
}
console.log('All cases passed', { text, colors });
```

Run from the repo root with `npx tsx verify-html-extract.ts`. Expected: fails (module doesn't exist yet).

- [ ] **Step 2: Implement `src/lib/htmlExtract.ts`**

```ts
import * as cheerio from 'cheerio';

export const MAX_EXTRACT_CHARS = 8000;

export function stripToPlainText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const EXCLUDED = new Set(['#fff', '#ffffff', '#000', '#000000']);

export function extractHexColors(html: string): string[] {
  const $ = cheerio.load(html);
  const colors = new Set<string>();

  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    for (const m of style.match(HEX_COLOR_PATTERN) || []) colors.add(m.toLowerCase());
  });
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    for (const m of css.match(HEX_COLOR_PATTERN) || []) colors.add(m.toLowerCase());
  });

  for (const excluded of EXCLUDED) colors.delete(excluded);
  return Array.from(colors).slice(0, 12);
}
```

- [ ] **Step 3: Run the verification script again, expect pass**

- [ ] **Step 4: Commit**

```bash
git add src/lib/htmlExtract.ts
git commit -m "feat: add HTML-to-plain-text and accent-color extraction helper"
```

---

### Task 5: `POST /api/sandbox/extract-brand` route

**Files:**
- Create: `src/app/api/sandbox/extract-brand/route.ts`

**Interfaces:**
- Consumes: `validateExtractBrandUrl`, `BRAND_EXTRACT_PROMPT`, `mockBrandExtraction`, `callOpenAiJson` (from Task 3 + existing `sandboxPrompts.ts`); `stripToPlainText`, `extractHexColors`, `MAX_EXTRACT_CHARS` (from Task 4).
- Produces: on success, `{ success: true, brandVoice: string, brandGuidelines: string, accentColors: string[] }` where `brandGuidelines` is the newly-extracted Value Proposition/Target Audience block only (the client merges it with any existing text — see Task 6).

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server';
import { validateExtractBrandUrl, BRAND_EXTRACT_PROMPT, callOpenAiJson, mockBrandExtraction } from '@/lib/sandboxPrompts';
import { stripToPlainText, extractHexColors, MAX_EXTRACT_CHARS } from '@/lib/htmlExtract';

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 300_000;

async function fetchPageWithLimits(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WhitePinePortal-BrandDNA/1.0' },
    });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) return await res.text();

    const decoder = new TextDecoder();
    let html = '';
    let bytesRead = 0;
    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateExtractBrandUrl(body?.url);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const { url } = body as { url: string };

    let html: string;
    try {
      html = await fetchPageWithLimits(url);
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'Timed out fetching the URL' : err.message || 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const pageText = stripToPlainText(html).slice(0, MAX_EXTRACT_CHARS);
    const candidateColors = extractHexColors(html);

    const userContext = [
      `Page text extracted from ${url}:`,
      pageText,
      candidateColors.length ? `Candidate accent colors found in the page's CSS: ${candidateColors.join(', ')}` : '',
    ].filter(Boolean).join('\n\n');

    const result = await callOpenAiJson(BRAND_EXTRACT_PROMPT, userContext, () => mockBrandExtraction(url));

    const brandGuidelines = [
      result.valueProp && `Value Proposition: ${result.valueProp}`,
      result.targetAudience && `Target Audience: ${result.targetAudience}`,
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      brandVoice: result.brandVoice || '',
      brandGuidelines,
      accentColors: Array.isArray(result.accentColors) ? result.accentColors.slice(0, 6) : [],
    });
  } catch (err: any) {
    console.error('Sandbox extract-brand error:', err);
    return NextResponse.json({ error: err.message || 'Brand extraction failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify against the running dev server**

```bash
curl -s -X POST http://localhost:3000/api/sandbox/extract-brand \
  -H "Content-Type: application/json" -d '{"url":"http://127.0.0.1/"}'
```
Expected: `400`, `{"error":"url may not target a local or private address"}`.

```bash
curl -s -X POST http://localhost:3000/api/sandbox/extract-brand \
  -H "Content-Type: application/json" -d '{"url":"ftp://example.com"}'
```
Expected: `400`.

```bash
curl -s -X POST http://localhost:3000/api/sandbox/extract-brand \
  -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
```
Expected: `200`, `success:true`, `brandVoice` starting with `[MOCK]` (no `OPENAI_API_KEY` locally), non-empty `brandGuidelines`, `accentColors` array.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sandbox/extract-brand/route.ts
git commit -m "feat: add /api/sandbox/extract-brand route"
```

---

### Task 6: `primaryColor` write-through on `POST /api/sandbox/brand`

**Files:**
- Modify: `src/app/api/sandbox/brand/route.ts`

**Interfaces:**
- Consumes: optional `primaryColor?: string` in the POST body.
- Produces: writes `primaryColor` to `Organization` when provided (existing column, no migration).

- [ ] **Step 1: Update the POST handler**

Replace the `POST` function body in `src/app/api/sandbox/brand/route.ts`:

```ts
export async function POST(req: Request) {
  try {
    const { organizationId, brandVoice, brandGuidelines, primaryColor } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        brandVoice,
        brandGuidelines,
        ...(primaryColor !== undefined ? { primaryColor } : {}),
      },
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save brand DNA' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

`npx tsc --noEmit` (checked fully in Task 8) plus a manual curl against a real `organizationId` in the local DB, confirming `organization.primaryColor` updates when `primaryColor` is included in the body and is untouched when omitted.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sandbox/brand/route.ts
git commit -m "feat: accept optional primaryColor on brand DNA save"
```

---

### Task 7: Brand DNA drawer UI — URL extraction + swatches

**Files:**
- Modify: `src/components/sandbox/BrandDnaDrawer.tsx`

**Interfaces:**
- Consumes: `POST /api/sandbox/extract-brand` (Task 5) response shape `{ brandVoice, brandGuidelines, accentColors }`; `POST /api/sandbox/brand` now accepts `primaryColor` (Task 6).

- [ ] **Step 1: Add state and reset it alongside the existing fields**

In `src/components/sandbox/BrandDnaDrawer.tsx`, update the state block and the `useEffect` (around lines 17-31):

```tsx
  const [brandVoice, setBrandVoice] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [accentColors, setAccentColors] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && organizationId) {
      setUrl('');
      setAccentColors([]);
      setPrimaryColor(null);
      fetch(`/api/sandbox/brand?organizationId=${organizationId}`)
        .then((res) => res.json())
        .then((data) => {
          setBrandVoice(data.brandVoice || '');
          setBrandGuidelines(data.brandGuidelines || '');
        })
        .catch(() => {});
    }
  }, [isOpen, organizationId]);
```

- [ ] **Step 2: Add the extract function**

Add alongside the existing `save` function:

```tsx
  const extractFromUrl = async () => {
    if (!url.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/sandbox/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setBrandVoice(data.brandVoice || brandVoice);
      setBrandGuidelines((prev) => [data.brandGuidelines, prev].filter(Boolean).join('\n\n'));
      setAccentColors(data.accentColors || []);
      toast.success('Brand DNA extracted — review before saving');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract brand DNA');
    } finally {
      setExtracting(false);
    }
  };
```

- [ ] **Step 3: Include `primaryColor` in the save payload**

Update `save` (around line 37-41):

```tsx
      const res = await fetch('/api/sandbox/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          brandVoice,
          brandGuidelines,
          ...(primaryColor ? { primaryColor } : {}),
        }),
      });
```

- [ ] **Step 4: Add the URL input + extract button + swatches to the JSX**

Insert this block right after the header `div` (after line 85, before `<form id="brand-dna-form" ...>`):

```tsx
              <div className="space-y-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <label className="text-slate-500 dark:text-gray-400 font-bold block text-[10px]">
                  Extract Brand DNA from URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://clientwebsite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-slate-50/80 border border-slate-200 text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white p-2.5 rounded-xl font-sans text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={extractFromUrl}
                    disabled={extracting || !url.trim()}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5"
                  >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extracting ? 'Extracting…' : 'Extract'}
                  </button>
                </div>
                {accentColors.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-500 dark:text-gray-400 text-[9px] font-sans">Accent colors:</span>
                    {accentColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        title={color}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          primaryColor === color ? 'border-emerald-500 scale-110' : 'border-slate-300 dark:border-slate-700'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
```

- [ ] **Step 5: Verify in browser**

Open the Brand DNA drawer for any organization, enter a real URL, click "Extract". Confirm (with no `OPENAI_API_KEY` set) the Brand Voice and Guidelines textareas populate with `[MOCK]`-prefixed text, color swatches render, clicking one highlights it, and "Save Brand DNA" still works.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/BrandDnaDrawer.tsx
git commit -m "feat: add Brand DNA URL extraction UI with accent-color swatches"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Browser walkthrough — Video Lab**

With dev server running and no `OPENAI_API_KEY`: generate a storyboard, generate scene audio on 2+ beats, confirm each shows the mock badge and a working (silent) `<audio>` control independently.

- [ ] **Step 3: Browser walkthrough — Brand DNA**

Open Brand DNA drawer, extract from a real URL, confirm fields populate and existing manual edit/save flow still works unchanged when no URL is used.

- [ ] **Step 4: Clean up scratch scripts**

Delete any temporary verification scripts created in Tasks 3-4 from the scratchpad — they were never intended to be committed.
