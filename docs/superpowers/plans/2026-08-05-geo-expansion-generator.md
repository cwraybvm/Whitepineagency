# Localized Geo-Expansion Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fulfillment-team tool that generates per-location Google RSA headlines/descriptions, Meta ad hooks, and a landing-page H1 from a core service + offer + location list, with CSV export for Google Ads bulk upload.

**Architecture:** A new Zod schema and prompt in `src/lib/sandboxPrompts.ts` (mirroring the existing `MasterCampaignPackageSchema`/`MASTER_CAMPAIGN_PROMPT` pair), driven by a new `/api/fulfillment/geo-expansion` route that calls the existing `callOpenAiJson` helper, surfaced through a new client page at `/fulfillment/geo-expansion` styled like the existing Flyer Generator, wired into the fulfillment task cards via a new quick-tool button.

**Tech Stack:** Next.js API routes, TypeScript, Zod, React (client components), lucide-react icons, sonner toasts.

## Global Constraints

- No test framework exists in this repo (`package.json` has no `test` script) — verification is `npx tsc --noEmit` and `npm run build`, not unit tests.
- Ephemeral only — no Prisma model, no persistence.
- Hard-fail on generation error — the route returns 500 and the page shows an error toast; no soft-fail swallowing.
- `src/lib/sandboxPrompts.ts` already imports `@/lib/prisma` (used elsewhere in the file) — client components must only ever import **types** from it (`import type { ... } from '@/lib/sandboxPrompts'`), never runtime values, so the prisma import is erased at compile time and never reaches the client bundle. This is the same pattern `MasterCampaignPanel.tsx` already uses. Do not add any new runtime (non-type) import from `sandboxPrompts.ts` into a client component.

---

### Task 1: Add `GeoExpansionPackageSchema`, `GEO_EXPANSION_PROMPT`, and mock fallback

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (insert after line 1036, right after `mockMasterCampaignPackage`'s closing brace, before `const ComplianceViolationSchema` at line 1038)

**Interfaces:**
- Consumes: `z` (already imported at top of file).
- Produces: `GeoExpansionPackageSchema` (Zod schema), `GeoExpansionPackage` (type), `GEO_EXPANSION_PROMPT` (string), `mockGeoExpansionPackage(locations: string[], coreService: string, offer: string): GeoExpansionPackage` — all consumed by Task 2's API route.

- [ ] **Step 1: Insert the schema, prompt, and mock function**

Insert this block immediately after line 1036 (`}` closing `mockMasterCampaignPackage`) and before line 1038 (`const ComplianceViolationSchema = z`):

```ts
const LocalizedAdVariationSchema = z
  .object({
    location: z.string().catch(''),
    googleHeadlines: z.array(z.string()).catch([]),
    googleDescriptions: z.array(z.string()).catch([]),
    metaHooks: z.array(z.string()).catch([]),
    landingPageH1: z.string().catch(''),
  })
  .catch({ location: '', googleHeadlines: [], googleDescriptions: [], metaHooks: [], landingPageH1: '' });

export const GeoExpansionPackageSchema = z.object({
  variations: z.array(LocalizedAdVariationSchema).catch([]),
});

export type GeoExpansionPackage = z.infer<typeof GeoExpansionPackageSchema>;

export const GEO_EXPANSION_PROMPT =
  'You are an expert local-service marketing agency expanding one core offer across multiple sub-market locations. ' +
  'Given a core service, a promo offer, and a list of target locations, produce localized ad copy for every location: ' +
  '3 Google RSA headlines (each under 30 characters); 2 Google RSA descriptions (each under 90 characters); ' +
  '2 Meta ad hooks (short, scroll-stopping opening lines); and 1 landing page H1. ' +
  'Every asset must be genuinely tailored to its specific location — reference the location by name and vary the ' +
  'phrasing across locations rather than reusing the same copy with the location name swapped in. ' +
  'Return a valid JSON object matching this structure exactly: {"variations": [{"location": "the location name", ' +
  '"googleHeadlines": ["headline under 30 chars", "headline under 30 chars", "headline under 30 chars"], ' +
  '"googleDescriptions": ["description under 90 chars", "description under 90 chars"], ' +
  '"metaHooks": ["hook 1", "hook 2"], "landingPageH1": "the landing page H1"}]} ' +
  'with exactly one object in "variations" per location given, each with exactly 3 googleHeadlines, 2 googleDescriptions, and 2 metaHooks.';

export function mockGeoExpansionPackage(locations: string[], coreService: string, offer: string): GeoExpansionPackage {
  const service = coreService.slice(0, 60);
  const dealOffer = offer.slice(0, 60);
  return {
    variations: locations.map((location) => ({
      location,
      googleHeadlines: [
        `[MOCK] ${dealOffer}`.slice(0, 30),
        `[MOCK] ${service} in ${location}`.slice(0, 30),
        `[MOCK] Book ${service} Today`.slice(0, 30),
      ],
      googleDescriptions: [
        `[MOCK] ${service} serving ${location}. ${dealOffer}. Call now.`.slice(0, 90),
        `[MOCK] Trusted ${service} pros in ${location}. Limited-time offer.`.slice(0, 90),
      ],
      metaHooks: [
        `[MOCK] ${location} — ${dealOffer}?`,
        `[MOCK] ${service} just got easier in ${location}.`,
      ],
      landingPageH1: `[MOCK] ${service} in ${location}`,
    })),
  };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `sandboxPrompts.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add geo-expansion schema, prompt, and mock fallback"
```

---

### Task 2: API route — `src/app/api/fulfillment/geo-expansion/route.ts`

**Files:**
- Create: `src/app/api/fulfillment/geo-expansion/route.ts`

**Interfaces:**
- Consumes: `GEO_EXPANSION_PROMPT`, `callOpenAiJson`, `mockGeoExpansionPackage`, `GeoExpansionPackageSchema` from `src/lib/sandboxPrompts.ts` (Task 1).
- Produces: `POST /api/fulfillment/geo-expansion` — request `{ coreService: string, offer: string, locations: string[], brandName?: string }`, success response `{ success: true, variations: LocalizedAdVariation[] }`, error response `{ error: string }` with status 400 (bad input) or 500 (generation failure). Consumed by Task 3's page.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server';
import { GEO_EXPANSION_PROMPT, callOpenAiJson, mockGeoExpansionPackage, GeoExpansionPackageSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { coreService, offer, locations, brandName } = await req.json();

    if (!coreService || !offer || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: 'coreService, offer, and a non-empty locations array are required' },
        { status: 400 },
      );
    }

    const userContext = [
      `Core service: ${coreService}`,
      `Promo offer: ${offer}`,
      brandName ? `Brand name: ${brandName}` : '',
      `Target locations: ${locations.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOpenAiJson(
      GEO_EXPANSION_PROMPT,
      userContext,
      () => mockGeoExpansionPackage(locations, coreService, offer),
      0.7,
      GeoExpansionPackageSchema,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Geo-expansion generation error:', err);
    return NextResponse.json({ error: err.message || 'Geo-expansion generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `api/fulfillment/geo-expansion/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fulfillment/geo-expansion/route.ts
git commit -m "feat: add geo-expansion API route"
```

---

### Task 3: UI page — `src/app/(fulfillment)/fulfillment/geo-expansion/page.tsx`

**Files:**
- Create: `src/app/(fulfillment)/fulfillment/geo-expansion/page.tsx`

**Interfaces:**
- Consumes: `POST /api/fulfillment/geo-expansion` from Task 2; `type GeoExpansionPackage` (type-only import) from `src/lib/sandboxPrompts.ts`; `CopyButton` from `src/components/sandbox/CopyButton.tsx`.
- Produces: page rendered at route `/fulfillment/geo-expansion`, which Task 4's nav button links to.

- [ ] **Step 1: Write the page**

```tsx
'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MapPinned, Loader2, Sparkles, FileSpreadsheet, ClipboardCopy } from 'lucide-react';
import type { GeoExpansionPackage } from '@/lib/sandboxPrompts';
import CopyButton from '@/components/sandbox/CopyButton';

type LocalizedAdVariation = GeoExpansionPackage['variations'][number];

function LimitBadge({ text, limit }: { text: string; limit: number }) {
  const over = text.length > limit;
  return (
    <span
      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
        over
          ? 'bg-red-500/15 text-red-300 border-red-500/40'
          : 'bg-slate-800/60 text-slate-400 border-slate-700'
      }`}
    >
      {text.length}/{limit}
    </span>
  );
}

function buildCsv(variations: LocalizedAdVariation[]): string {
  const header = 'Location,Headline 1,Headline 2,Headline 3,Description 1,Description 2';
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  const rows = variations.map((v) =>
    [v.location, ...v.googleHeadlines, ...v.googleDescriptions].map(escape).join(','),
  );
  return [header, ...rows].join('\n');
}

function buildPlainText(variations: LocalizedAdVariation[]): string {
  return variations
    .map((v) =>
      [
        `# ${v.location}`,
        'Google RSA Headlines:',
        ...v.googleHeadlines.map((h) => `- ${h}`),
        'Google RSA Descriptions:',
        ...v.googleDescriptions.map((d) => `- ${d}`),
        'Meta Hooks:',
        ...v.metaHooks.map((h) => `- ${h}`),
        `Landing Page H1: ${v.landingPageH1}`,
      ].join('\n'),
    )
    .join('\n\n');
}

export default function GeoExpansionPage() {
  const [coreService, setCoreService] = useState('');
  const [offer, setOffer] = useState('');
  const [locationsText, setLocationsText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<LocalizedAdVariation[]>([]);

  const locations = locationsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const canGenerate = coreService.trim() && offer.trim() && locations.length > 0 && !generating;

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/fulfillment/geo-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreService, offer, locations }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      setVariations(data.variations);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate geo-expansion package');
    } finally {
      setGenerating(false);
    }
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(buildCsv(variations));
      toast.success('CSV copied to clipboard');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(variations));
      toast.success('Copied full bundle to clipboard');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
          <MapPinned className="w-3.5 h-3.5" /> FULFILLMENT
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Localized Geo-Expansion Generator</h1>
        <p className="text-xs text-slate-400">
          Turn one offer into ready-to-run localized ad copy for every sub-market you serve.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* LEFT: Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Expansion Controls</h2>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Core Service</label>
            <input
              value={coreService}
              onChange={(e) => setCoreService(e.target.value)}
              placeholder="e.g. AC Tune-Up"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Offer Details</label>
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              rows={3}
              placeholder="e.g. $79 Spring AC Tune-Up Special"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Target Locations (one per line)</label>
            <textarea
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              rows={5}
              placeholder={'Austin, TX\nRound Rock, TX\nCedar Park, TX'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate Geo-Expansion'}
          </button>

          {variations.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={copyCsv}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Copy CSV for Google Ads
              </button>
              <button
                onClick={copyAll}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <ClipboardCopy className="w-3.5 h-3.5" /> Copy All to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {variations.length === 0 ? (
            <div className="sm:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-400 text-sm">
              Enter a service, offer, and locations, then Generate Geo-Expansion to see localized copy here.
            </div>
          ) : (
            variations.map((v, i) => (
              <div key={i} className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 pr-16 space-y-3">
                <CopyButton
                  text={[
                    `# ${v.location}`,
                    ...v.googleHeadlines,
                    ...v.googleDescriptions,
                    ...v.metaHooks,
                    v.landingPageH1,
                  ].join('\n')}
                />
                <h3 className="text-sm font-black text-white">{v.location}</h3>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Google RSA Headlines</span>
                  {v.googleHeadlines.map((h, hi) => (
                    <div key={hi} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                      <span>{h}</span>
                      <LimitBadge text={h} limit={30} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Google RSA Descriptions</span>
                  {v.googleDescriptions.map((d, di) => (
                    <div key={di} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                      <span>{d}</span>
                      <LimitBadge text={d} limit={90} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Meta Hooks</span>
                  {v.metaHooks.map((h, hi) => (
                    <p key={hi} className="text-xs text-slate-200">{h}</p>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Landing Page H1</span>
                  <p className="text-xs text-slate-200">{v.landingPageH1}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `fulfillment/geo-expansion/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(fulfillment)/fulfillment/geo-expansion/page.tsx"
git commit -m "feat: add geo-expansion generator UI page"
```

---

### Task 4: Wire "Geo" quick-tool button into fulfillment task cards

**Files:**
- Modify: `src/app/(fulfillment)/fulfillment/page.tsx:602-615`

**Interfaces:**
- Consumes: route `/fulfillment/geo-expansion` from Task 3.
- Produces: nothing consumed by later tasks (final task).

- [ ] **Step 1: Add the button**

Current code at lines 602-615:

```tsx
                            <div className="flex gap-2">
                              <button
                                onClick={() => router.push('/fulfillment/flyer-generator')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Flyer
                              </button>
                              <button
                                onClick={() => router.push('/admin/onboarding')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Onboard
                              </button>
                            </div>
```

Replace with:

```tsx
                            <div className="flex gap-2">
                              <button
                                onClick={() => router.push('/fulfillment/flyer-generator')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Flyer
                              </button>
                              <button
                                onClick={() => router.push('/fulfillment/geo-expansion')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Geo
                              </button>
                              <button
                                onClick={() => router.push('/admin/onboarding')}
                                className="text-slate-400 hover:text-slate-200 font-mono"
                              >
                                Onboard
                              </button>
                            </div>
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full build check**

Run: `npm run build`
Expected: build succeeds with no client/server bundle boundary errors (confirms the type-only import of `GeoExpansionPackage` in Task 3's page doesn't pull `@/lib/prisma` into the client bundle).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(fulfillment)/fulfillment/page.tsx"
git commit -m "feat: add Geo quick-tool button to fulfillment task cards"
```

---

## Self-Review Notes

- Spec coverage: schema/prompt/mock (Task 1), API route (Task 2), UI page with char-limit badges, CSV export, copy-all (Task 3), nav wiring (Task 4), `tsc --noEmit` + `npm run build` verification (every task + final task) — all five spec sections covered.
- No placeholders: every step has literal, complete code and exact file paths/line anchors.
- Type consistency: `GeoExpansionPackage['variations'][number]` in Task 3 derives directly from `GeoExpansionPackageSchema` defined in Task 1 — no separately hand-written duplicate type. `coreService`/`offer`/`locations` field names match exactly between Task 2's route body and Task 3's fetch call.
