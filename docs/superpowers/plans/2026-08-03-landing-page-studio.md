# Landing Page Matching Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Landing Page Studio" tool to `/sandbox` that generates a matched landing-page copy set (hero headline, subheadline, primary CTA, 3 value-prop bullets, testimonial) from either an existing staged asset's hook or a fresh brief, with inline editing, live scoring, and one-click staging as a `LANDING_PAGE` asset.

**Architecture:** A new `POST /api/sandbox/landing-page` route reuses the existing `brandClauseFor`/`callOpenAiJson` helpers with a new prompt constant. The existing shared `creativeScore.ts` scorer and `ScoreBadge`/Auto-Optimize path are extended to understand the new `LANDING_PAGE` type instead of building a parallel scoring system. A new `LandingPageStudioPanel.tsx` follows the same two-column controls/preview layout every other sandbox panel already uses, and saves through the existing generic `/api/sandbox/assets` route.

**Tech Stack:** Next.js App Router route handlers, Prisma, raw `fetch` to OpenAI (via existing `sandboxPrompts.ts` helpers), React/TypeScript, `tsx` for standalone script execution.

## Global Constraints

- No new AI-calling code — both `POST /api/sandbox/landing-page` and the refine/Auto-Optimize path route through the existing `callOpenAiJson` in `src/lib/sandboxPrompts.ts`.
- No new DB table and no new persistence route — `LANDING_PAGE` is just another `CreativeAsset.type` string value, saved through the existing `POST /api/sandbox/assets`.
- Testimonial copy must read as a generic, clearly-placeholder quote (role + location, e.g. "— Homeowner, Springfield"), never a fabricated named individual.
- Extend the shared `creativeScore.ts` scorer for the new type rather than writing a separate scoring path.
- `scoreCompliance` for `LANDING_PAGE` is unconditionally `{ points: 25, ok: true }` (same treatment as `VIDEO_SCRIPT`) — there is no fixed external character-limit spec to check against.

---

### Task 1: Landing page prompt, input validation, and scoring integration

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (add `LANDING_PAGE_PROMPT`, `validateLandingPageInput`; extend `basePromptForType`)
- Modify: `src/lib/creativeScore.ts` (extend `ScorableType`, `hookTextFor`, `ctaTextFor`, `scoreCompliance`)
- Modify: `src/app/api/sandbox/generate/route.ts` (add `'LANDING_PAGE'` to `VALID_SCORABLE_TYPES`)
- Create: `scripts/test-landing-page-validation.ts`

**Interfaces:**
- Produces: `export const LANDING_PAGE_PROMPT: string`
- Produces: `export function validateLandingPageInput(body: any): string | null` — returns an error message if invalid, `null` if valid.
- Produces: `ScorableType` (in `src/lib/creativeScore.ts`) gains `'LANDING_PAGE'` as a member.
- Consumes (unchanged, for context): `brandClauseFor`, `callOpenAiJson` already exported from `src/lib/sandboxPrompts.ts`.

- [ ] **Step 1: Add `LANDING_PAGE_PROMPT` and `validateLandingPageInput` to `src/lib/sandboxPrompts.ts`**

Append to `src/lib/sandboxPrompts.ts`:

```ts
export const LANDING_PAGE_PROMPT =
  'You are an expert direct-response landing page copywriter for a local-service marketing agency. ' +
  'Given either a source ad/hook to match or a brief, write a matching landing page copy set: a hero headline that echoes the source hook, a supporting subheadline, a primary CTA button label, exactly 3 value-proposition bullets, and one social-proof testimonial. ' +
  'Write the testimonial as a short, generic, clearly-placeholder quote attributed to a role and location (e.g. "— Homeowner, Springfield"), never a fabricated named individual — a real client quote replaces it before publishing. ' +
  'Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the subheadline", "metadata": {"heroHeadline": "the hero headline", "subheadline": "the subheadline", "primaryCta": "the CTA button label", "valueProps": ["value prop 1", "value prop 2", "value prop 3"], "testimonial": "the placeholder testimonial quote"}} with exactly 3 entries in the valueProps array.';

export function validateLandingPageInput(body: any): string | null {
  if (body?.mode !== 'asset' && body?.mode !== 'brief') {
    return "mode must be 'asset' or 'brief'";
  }
  if (body.mode === 'asset' && (typeof body.assetId !== 'string' || !body.assetId.trim())) {
    return 'assetId is required in asset mode';
  }
  if (body.mode === 'brief' && (typeof body.prompt !== 'string' || !body.prompt.trim())) {
    return 'prompt is required in brief mode';
  }
  return null;
}
```

Then update `basePromptForType` so refine mode (Auto-Optimize) works for this type too — change:

```ts
export function basePromptForType(type: ScorableType): string {
  if (type === 'COPY') return SYSTEM_PROMPTS.copy;
  if (type === 'AD') return SYSTEM_PROMPTS.ad;
  if (type === 'VIDEO_SCRIPT') return SYSTEM_PROMPTS.video;
  return DRIP_PROMPT;
}
```

to:

```ts
export function basePromptForType(type: ScorableType): string {
  if (type === 'COPY') return SYSTEM_PROMPTS.copy;
  if (type === 'AD') return SYSTEM_PROMPTS.ad;
  if (type === 'VIDEO_SCRIPT') return SYSTEM_PROMPTS.video;
  if (type === 'LANDING_PAGE') return LANDING_PAGE_PROMPT;
  return DRIP_PROMPT;
}
```

- [ ] **Step 2: Extend `ScorableType` and scoring functions in `src/lib/creativeScore.ts`**

Change the type definition:

```ts
export type ScorableType = 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'DRIP' | 'LANDING_PAGE';
```

In `hookTextFor`, add a branch before the final `return firstSentence(content);`:

```ts
function hookTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.headline || firstSentence(content);
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[0]?.line || firstSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.heroHeadline || firstSentence(content);
  return firstSentence(content);
}
```

In `ctaTextFor`, add a branch:

```ts
function ctaTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.cta || '';
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[metadata.beats.length - 1]?.line || lastSentence(content);
  if (type === 'DRIP') return metadata?.steps?.[metadata.steps.length - 1]?.content || lastSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.primaryCta || lastSentence(content);
  return lastSentence(content);
}
```

In `scoreCompliance`, add a branch at the top of the function body (before the `VIDEO_SCRIPT` check):

```ts
function scoreCompliance(type: ScorableType, content: string, metadata: any): { points: number; ok: boolean } {
  if (type === 'VIDEO_SCRIPT' || type === 'LANDING_PAGE') return { points: 25, ok: true };

  if (type === 'AD') {
    // ... unchanged
```

(Leave the rest of `scoreCompliance` exactly as-is — only the first `if` line changes.)

- [ ] **Step 3: Add `'LANDING_PAGE'` to `VALID_SCORABLE_TYPES` in `src/app/api/sandbox/generate/route.ts`**

Change:

```ts
const VALID_SCORABLE_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP'];
```

to:

```ts
const VALID_SCORABLE_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP', 'LANDING_PAGE'];
```

- [ ] **Step 4: Write the failing validation test**

Create `scripts/test-landing-page-validation.ts`:

```ts
import { validateLandingPageInput } from '../src/lib/sandboxPrompts';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { mode: 'bogus' }, expectError: true },
  { body: { mode: 'asset' }, expectError: true },
  { body: { mode: 'asset', assetId: '' }, expectError: true },
  { body: { mode: 'asset', assetId: '   ' }, expectError: true },
  { body: { mode: 'asset', assetId: 'abc-123' }, expectError: false },
  { body: { mode: 'brief' }, expectError: true },
  { body: { mode: 'brief', prompt: '' }, expectError: true },
  { body: { mode: 'brief', prompt: '   ' }, expectError: true },
  { body: { mode: 'brief', prompt: 'A roofing company special offer' }, expectError: false },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateLandingPageInput(body);
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

- [ ] **Step 5: Run it to verify it fails, then implement, then verify it passes**

Run: `npx tsx scripts/test-landing-page-validation.ts`
Expected first run (before Step 1's code exists): FAIL with an import/type error since `validateLandingPageInput` doesn't exist yet. Since Steps 1 and 4 are written together above, comment out the `validateLandingPageInput` export temporarily, run the script to confirm it fails, then restore Step 1's code.

Run again: `npx tsx scripts/test-landing-page-validation.ts`
Expected: `All validation cases passed`

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (This also verifies every existing call site of `hookTextFor`/`ctaTextFor`/`scoreCompliance`/`ScorableType` still compiles with the new union member — none should need changes since all are internal to `creativeScore.ts` or pass strings through.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/sandboxPrompts.ts src/lib/creativeScore.ts src/app/api/sandbox/generate/route.ts scripts/test-landing-page-validation.ts
git commit -m "feat: add landing page prompt, validation, and scoring support"
```

---

### Task 2: Landing page generation API route

**Files:**
- Create: `src/app/api/sandbox/landing-page/route.ts`

**Interfaces:**
- Consumes: `validateLandingPageInput`, `LANDING_PAGE_PROMPT`, `brandClauseFor`, `callOpenAiJson` from `@/lib/sandboxPrompts` (Task 1).
- Produces: `POST /api/sandbox/landing-page` — request `{ mode: 'asset', assetId: string, organizationId?: string }` or `{ mode: 'brief', prompt: string, organizationId?: string }`; success response `{ success: true, title: string, content: string, metadata: { heroHeadline: string, subheadline: string, primaryCta: string, valueProps: string[], testimonial: string } }` (200); error response `{ error: string }` (400 for invalid input, 404 if `assetId` doesn't resolve to an existing asset, 500 for upstream failure). Task 4 (UI) consumes this shape directly.

- [ ] **Step 1: Write the route handler**

Create `src/app/api/sandbox/landing-page/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateLandingPageInput, LANDING_PAGE_PROMPT, brandClauseFor, callOpenAiJson } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationError = validateLandingPageInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { mode, organizationId } = body;

    let userContext: string;
    if (mode === 'asset') {
      const asset = await prisma.creativeAsset.findUnique({ where: { id: body.assetId } });
      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }
      userContext = [
        `Source ad/hook to match — title: ${asset.title}`,
        `Content: ${asset.content}`,
        asset.metadata && `Metadata: ${JSON.stringify(asset.metadata)}`,
      ].filter(Boolean).join('\n');
    } else {
      userContext = `Brief: ${body.prompt}`;
    }

    const brandClause = await brandClauseFor(organizationId);
    const systemPrompt = `${LANDING_PAGE_PROMPT}\n\n${brandClause}`;

    const result = await callOpenAiJson(systemPrompt, userContext);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox landing-page error:', err);
    return NextResponse.json({ error: err.message || 'Landing page generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify validation and not-found paths (no live API call needed)**

With the dev server running (`npm run dev`), run:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/landing-page -H "Content-Type: application/json" -d "{}"
```

Expected: `{"error":"mode must be 'asset' or 'brief'"}` with a 400 status.

```bash
curl -s -X POST http://localhost:3000/api/sandbox/landing-page -H "Content-Type: application/json" -d "{\"mode\":\"asset\",\"assetId\":\"does-not-exist\"}"
```

Expected: `{"error":"Asset not found"}` with a 404 status — confirms the Prisma lookup and validation wiring without needing `OPENAI_API_KEY` to be set yet.

- [ ] **Step 3: Manual end-to-end verification (requires `OPENAI_API_KEY` set)**

```bash
curl -s -X POST http://localhost:3000/api/sandbox/landing-page -H "Content-Type: application/json" -d "{\"mode\":\"brief\",\"prompt\":\"Emergency roof leak repair, same-day service\"}"
```

Expected: `{"success":true,"title":"...","content":"...","metadata":{"heroHeadline":"...","subheadline":"...","primaryCta":"...","valueProps":["...","...","..."],"testimonial":"..."}}` with exactly 3 `valueProps`. If `OPENAI_API_KEY` isn't set in this environment, this step returns a 500 with a clear message — expected, note it in the report rather than skipping the check.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sandbox/landing-page/route.ts
git commit -m "feat: add /api/sandbox/landing-page route"
```

---

### Task 3: Types for the Landing Page Studio

**Files:**
- Modify: `src/components/sandbox/types.ts`

**Interfaces:**
- Produces: `SandboxTool` gains `'landing-page'` as a member.
- Produces: `export type LandingPageDraft = { title: string; content: string; metadata: { heroHeadline: string; subheadline: string; primaryCta: string; valueProps: string[]; testimonial: string } };`

- [ ] **Step 1: Update `SandboxTool` and add `LandingPageDraft`**

In `src/components/sandbox/types.ts`, change:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe';
```

to:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe' | 'landing-page';
```

Then add, near the bottom of the file (after `OptimizeResult`):

```ts
export type LandingPageDraft = {
  title: string;
  content: string;
  metadata: {
    heroHeadline: string;
    subheadline: string;
    primaryCta: string;
    valueProps: string[];
    testimonial: string;
  };
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. Any existing exhaustive `switch`/conditional over `SandboxTool` values (check `src/app/(sandbox)/sandbox/page.tsx` and `src/components/sandbox/StagedAssetsList.tsx`, both of which reference `SandboxTool`) is additive-safe since neither uses an exhaustiveness-checked switch — both use plain `if`/lookup-object patterns that silently no-op on an unhandled value, which Task 4 fills in.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/types.ts
git commit -m "feat: add landing-page SandboxTool and LandingPageDraft type"
```

---

### Task 4: Landing Page Studio panel and wiring

**Files:**
- Create: `src/components/sandbox/LandingPageStudioPanel.tsx`
- Modify: `src/app/(sandbox)/sandbox/page.tsx`
- Modify: `src/components/sandbox/StagedAssetsList.tsx`

**Interfaces:**
- Consumes: `POST /api/sandbox/landing-page` (Task 2), `SandboxTool`, `LandingPageDraft`, `OrgBrand` (Task 3 / pre-existing), `ScoreBadge` (pre-existing, `type="LANDING_PAGE"` now valid per Task 1), `POST /api/sandbox/assets` (pre-existing).

- [ ] **Step 1: Create `LandingPageStudioPanel.tsx`**

Create `src/components/sandbox/LandingPageStudioPanel.tsx`:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2, Save, Loader2, Quote, CheckCircle2, ArrowRight, LayoutPanelTop } from 'lucide-react';
import type { LandingPageDraft, OrgBrand } from './types';
import ScoreBadge from './ScoreBadge';

type SourceMode = 'asset' | 'brief';

export default function LandingPageStudioPanel() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('brief');
  const [prompt, setPrompt] = useState('Emergency roof leak repair, same-day service');
  const [assets, setAssets] = useState<{ id: string; title: string; type: string }[]>([]);
  const [assetId, setAssetId] = useState('');
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);

  useEffect(() => {
    fetch('/api/sandbox/assets').then((res) => res.json()).then(setAssets).catch(() => {});
    fetch('/api/sandbox/organizations').then((res) => res.json()).then(setOrgs).catch(() => {});
  }, []);

  const updateField = (patch: Partial<LandingPageDraft['metadata']>) => {
    setDraft((prev) => (prev ? { ...prev, metadata: { ...prev.metadata, ...patch } } : prev));
  };

  const updateValueProp = (index: number, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const valueProps = [...prev.metadata.valueProps];
      valueProps[index] = value;
      return { ...prev, metadata: { ...prev.metadata, valueProps } };
    });
  };

  const generate = async () => {
    if (sourceMode === 'asset' && !assetId) {
      toast.error('Pick a staged asset first');
      return;
    }
    if (sourceMode === 'brief' && !prompt.trim()) {
      toast.error('Enter a brief first');
      return;
    }
    setGenerating(true);
    try {
      const body =
        sourceMode === 'asset'
          ? { mode: 'asset', assetId, organizationId: organizationId || undefined }
          : { mode: 'brief', prompt, organizationId: organizationId || undefined };
      const res = await fetch('/api/sandbox/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft({ title: data.title, content: data.content, metadata: data.metadata });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate landing page');
    } finally {
      setGenerating(false);
    }
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
          type: 'LANDING_PAGE',
          content: draft.content,
          metadata: draft.metadata,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Landing Page Studio Controls</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSourceMode('brief')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'brief' ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              From Brief
            </button>
            <button
              onClick={() => setSourceMode('asset')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                sourceMode === 'asset' ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              From Staged Asset
            </button>
          </div>
        </div>

        {sourceMode === 'brief' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Brief</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Staged Asset to Match</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Client (for Brand DNA)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">No client selected (default tone)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Landing Page'}
        </button>
      </div>

      {/* RIGHT: Section previews */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[360px] flex flex-col">
        {draft ? (
          <div className="flex-1 flex flex-col space-y-5">
            <div className="flex items-center gap-2 text-slate-500">
              <LayoutPanelTop className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase">{draft.title}</span>
            </div>

            <input
              value={draft.metadata.heroHeadline}
              onChange={(e) => updateField({ heroHeadline: e.target.value })}
              className="w-full bg-transparent text-2xl font-black text-white leading-tight focus:outline-none border-b border-transparent focus:border-sky-500 pb-1"
            />
            <textarea
              value={draft.metadata.subheadline}
              onChange={(e) => updateField({ subheadline: e.target.value })}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
            />

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase">Value Propositions</label>
              {draft.metadata.valueProps.map((vp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    value={vp}
                    onChange={(e) => updateValueProp(i, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              ))}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-1.5">
              <Quote className="w-4 h-4 text-slate-500" />
              <textarea
                value={draft.metadata.testimonial}
                onChange={(e) => updateField({ testimonial: e.target.value })}
                rows={2}
                className="w-full bg-transparent text-sm text-slate-300 italic focus:outline-none resize-none"
              />
            </div>

            <button disabled className="w-full py-2.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 bg-indigo-600">
              <input
                value={draft.metadata.primaryCta}
                onChange={(e) => updateField({ primaryCta: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-center focus:outline-none w-full"
              />
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>

            <ScoreBadge
              content={draft.content}
              type="LANDING_PAGE"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content, metadata: r.metadata || draft.metadata })}
            />

            <button
              onClick={saveToStaged}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 mt-auto"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm">
            Pick a source and generate to see the landing page sections here.
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: the disabled CTA `<button>` wrapping an `<input>` mirrors this codebase's existing pattern in `AdBuilderPanel.tsx` (a `disabled` button used purely as a styled preview surface), but since it now contains an editable `<input>`, keep `onClick={(e) => e.stopPropagation()}` on the input as shown so clicking into it doesn't fight the disabled button semantics in any parent handler — there are none today, but it's a one-line defensive no-op, not a workaround for an existing bug.

- [ ] **Step 2: Wire the new tab into `src/app/(sandbox)/sandbox/page.tsx`**

Change the import block:

```ts
import CopyStudioPanel from '@/components/sandbox/CopyStudioPanel';
import AdBuilderPanel from '@/components/sandbox/AdBuilderPanel';
import VideoLabPanel from '@/components/sandbox/VideoLabPanel';
import CampaignBatchPanel from '@/components/sandbox/CampaignBatchPanel';
import SwipeAnalyzerPanel from '@/components/sandbox/SwipeAnalyzerPanel';
import StagedAssetsList from '@/components/sandbox/StagedAssetsList';
```

to:

```ts
import CopyStudioPanel from '@/components/sandbox/CopyStudioPanel';
import AdBuilderPanel from '@/components/sandbox/AdBuilderPanel';
import VideoLabPanel from '@/components/sandbox/VideoLabPanel';
import CampaignBatchPanel from '@/components/sandbox/CampaignBatchPanel';
import SwipeAnalyzerPanel from '@/components/sandbox/SwipeAnalyzerPanel';
import LandingPageStudioPanel from '@/components/sandbox/LandingPageStudioPanel';
import StagedAssetsList from '@/components/sandbox/StagedAssetsList';
```

Change the icon import line:

```ts
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch } from 'lucide-react';
```

to:

```ts
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop } from 'lucide-react';
```

Change the `TABS` array:

```ts
const TABS: { id: SandboxTool; label: string; icon: React.ElementType }[] = [
  { id: 'copy', label: 'Copy Studio', icon: PenTool },
  { id: 'ad', label: 'Ad Builder', icon: LayoutTemplate },
  { id: 'video', label: 'Video Lab', icon: Clapperboard },
  { id: 'campaign', label: 'Campaign Engine', icon: Rocket },
  { id: 'swipe', label: 'Ad Swipe File', icon: ScanSearch },
];
```

to:

```ts
const TABS: { id: SandboxTool; label: string; icon: React.ElementType }[] = [
  { id: 'copy', label: 'Copy Studio', icon: PenTool },
  { id: 'ad', label: 'Ad Builder', icon: LayoutTemplate },
  { id: 'video', label: 'Video Lab', icon: Clapperboard },
  { id: 'landing-page', label: 'Landing Page Studio', icon: LayoutPanelTop },
  { id: 'campaign', label: 'Campaign Engine', icon: Rocket },
  { id: 'swipe', label: 'Ad Swipe File', icon: ScanSearch },
];
```

Change the render block:

```tsx
{activeTool === 'copy' && <CopyStudioPanel />}
{activeTool === 'ad' && <AdBuilderPanel />}
{activeTool === 'video' && <VideoLabPanel />}
{activeTool === 'campaign' && <CampaignBatchPanel />}
{activeTool === 'swipe' && <SwipeAnalyzerPanel />}
```

to:

```tsx
{activeTool === 'copy' && <CopyStudioPanel />}
{activeTool === 'ad' && <AdBuilderPanel />}
{activeTool === 'video' && <VideoLabPanel />}
{activeTool === 'landing-page' && <LandingPageStudioPanel />}
{activeTool === 'campaign' && <CampaignBatchPanel />}
{activeTool === 'swipe' && <SwipeAnalyzerPanel />}
```

- [ ] **Step 3: Wire the Staged Assets filter in `src/components/sandbox/StagedAssetsList.tsx`**

Change:

```ts
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT' };
```

to:

```ts
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT', 'landing-page': 'LANDING_PAGE' };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open `/sandbox`, click the "Landing Page Studio" tab, generate from a Brief, confirm all 5 section fields populate and are individually editable, confirm the ScoreBadge appears and Auto-Optimize works when score < 80, save to Staged Assets, then switch source mode to "From Staged Asset", pick an existing asset, and confirm generation still works. Switch to the Staged Assets view for this tab and confirm the saved `LANDING_PAGE` asset appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/LandingPageStudioPanel.tsx src/app/'(sandbox)'/sandbox/page.tsx src/components/sandbox/StagedAssetsList.tsx
git commit -m "feat: add Landing Page Studio panel and wire into sandbox tabs"
```
