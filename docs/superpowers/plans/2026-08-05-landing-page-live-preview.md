# Landing Page Studio Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `LandingPageStudioPanel.tsx` into a split-screen studio: left Inspector (generate controls, editable fields, section-level AI refine buttons, export/deploy toolbar) and right live-rendered iframe preview with device-width toggles.

**Architecture:** One new pure HTML-string-rendering function (`renderLandingPageHtml`) is the single source of truth for the iframe `srcDoc`, clipboard copy, file download, and the WordPress push body. Section-level AI refine is one new generic route (`{ field, currentValue, instruction }` → `{ text }`) called uniformly by all three action buttons. Deploy adds an optional `postType` to the existing `/api/wordpress` route and a new thin webhook route wrapping the existing `dispatchWebhookEvent` helper.

**Tech Stack:** Next.js App Router route handlers, React client components, Zod schemas, existing `callOpenAiJson`/`dispatchWebhookEvent` lib functions. No new npm dependencies. This repo has no test framework — verification is `npx tsc --noEmit`, standalone `scripts/test-*.ts` scripts run via `npx tsx` (matches `scripts/test-landing-page-validation.ts`), and manual browser checks.

## Global Constraints

- No new npm dependencies (Tailwind loaded via CDN `<script>` inside the rendered HTML string, same as the spec's literal "Copy Clean HTML/Tailwind" ask).
- No test framework in this repo — every task's runnable check is either a `scripts/test-*.ts` script (`npx tsx scripts/test-*.ts`) or `npx tsc --noEmit`, following the existing convention.
- All new/changed files follow the existing sandbox panel conventions already in the codebase (`toast.error` on fetch failure, `finally`-block loading-state reset, `downloadTextFile`/`slugify` local helpers duplicated per-file as already done in `BrandIdentityPanel.tsx`).
- Read-only/idempotent AI calls (section refine) go through `fetchGenerationJson` (retry/backoff). Side-effecting calls (WordPress push, webhook push) use plain `fetch` — retrying those would create duplicate WP drafts / duplicate webhook deliveries.
- Source spec: `docs/superpowers/specs/2026-08-05-landing-page-live-preview-design.md`.

---

### Task 1: `renderLandingPageHtml` pure function

**Files:**
- Create: `src/components/sandbox/landingPageHtml.ts`
- Create: `scripts/test-landing-page-html.ts`

**Interfaces:**
- Consumes: `LandingPageDraft` type from `src/components/sandbox/types.ts` (existing: `{ title, content, metadata: { heroHeadline, subheadline, primaryCta, valueProps, testimonial } }` — Task 2 adds `metadata.guaranteeBadge?: string` to this same type before this function needs it at runtime, but this task can reference the field optimistically since TS just needs the property to exist by the time both files compile together).
- Produces: `export function renderLandingPageHtml(draft: LandingPageDraft, brandColor?: string | null): string` — used by Task 6 for the iframe `srcDoc` and for copy/download/WordPress body.

- [ ] **Step 1: Write `landingPageHtml.ts`**

```ts
import type { LandingPageDraft } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLandingPageHtml(draft: LandingPageDraft, brandColor?: string | null): string {
  const accent = brandColor && /^#[0-9a-fA-F]{3,8}$/.test(brandColor) ? brandColor : '#059669';
  const { heroHeadline, subheadline, primaryCta, valueProps, testimonial, guaranteeBadge } = draft.metadata;

  const valuePropsHtml = valueProps
    .filter(Boolean)
    .map(
      (vp) => `
        <li class="flex items-center gap-2 text-slate-700">
          <span class="inline-block w-2 h-2 rounded-full" style="background-color:${accent}"></span>
          <span>${escapeHtml(vp)}</span>
        </li>`,
    )
    .join('');

  const badgeHtml = guaranteeBadge
    ? `<span class="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full border" style="border-color:${accent};color:${accent}">${escapeHtml(guaranteeBadge)}</span>`
    : '';

  const testimonialHtml = testimonial
    ? `
      <blockquote class="mt-10 max-w-xl mx-auto text-center italic text-slate-600 border-l-4 pl-4" style="border-color:${accent}">
        "${escapeHtml(testimonial)}"
      </blockquote>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(draft.title || 'Landing Page Preview')}</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white font-sans">
  <main class="max-w-3xl mx-auto px-6 py-16 text-center">
    <h1 class="text-4xl font-black text-slate-900 leading-tight">${escapeHtml(heroHeadline)}</h1>
    <p class="mt-4 text-lg text-slate-600">${escapeHtml(subheadline)}</p>
    <ul class="mt-8 flex flex-col items-start gap-2 max-w-sm mx-auto text-left">${valuePropsHtml}</ul>
    <a href="#" class="inline-block mt-8 px-6 py-3 rounded-lg text-white font-bold" style="background-color:${accent}">${escapeHtml(primaryCta)}</a>
    ${badgeHtml}
    ${testimonialHtml}
  </main>
</body>
</html>`;
}
```

- [ ] **Step 2: Write the runnable self-check**

```ts
// scripts/test-landing-page-html.ts
import { renderLandingPageHtml } from '../src/components/sandbox/landingPageHtml';
import type { LandingPageDraft } from '../src/components/sandbox/types';

const draft: LandingPageDraft = {
  title: 'Test Page',
  content: 'subhead',
  metadata: {
    heroHeadline: 'Emergency Roof Repair <Today>',
    subheadline: 'Same-day service',
    primaryCta: 'Get a Quote',
    valueProps: ['Licensed & Insured', 'Same-Day Availability'],
    testimonial: 'They fixed it fast!',
    guaranteeBadge: '100% Satisfaction Guaranteed',
  },
};

const html = renderLandingPageHtml(draft, '#2563eb');

const checks: [string, boolean][] = [
  ['contains escaped headline', html.includes('Emergency Roof Repair &lt;Today&gt;')],
  ['contains subheadline', html.includes('Same-day service')],
  ['contains both value props', html.includes('Licensed &amp; Insured') && html.includes('Same-Day Availability')],
  ['contains CTA text', html.includes('Get a Quote')],
  ['contains guarantee badge', html.includes('100% Satisfaction Guaranteed')],
  ['contains testimonial', html.includes('They fixed it fast')],
  ['uses brand color', html.includes('#2563eb')],
  ['loads tailwind CDN', html.includes('cdn.tailwindcss.com')],
];

const noBadgeHtml = renderLandingPageHtml({ ...draft, metadata: { ...draft.metadata, guaranteeBadge: undefined } });
checks.push(['omits badge markup when unset', !noBadgeHtml.includes('rounded-full border')]);

let failures = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    failures++;
    console.error(`FAIL: ${label}`);
  }
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All landing page HTML checks passed');
```

- [ ] **Step 3: Run the check**

Run: `npx tsx scripts/test-landing-page-html.ts`
Expected: `All landing page HTML checks passed` (will fail to compile until Task 2 adds `guaranteeBadge` to the type — run this check again at the end of Task 2, not required to pass standalone before then)

- [ ] **Step 4: Commit**

```bash
git add src/components/sandbox/landingPageHtml.ts scripts/test-landing-page-html.ts
git commit -m "feat: add renderLandingPageHtml for landing page live preview"
```

---

### Task 2: `guaranteeBadge` field + section-refine schema/prompt/mock

**Files:**
- Modify: `src/components/sandbox/types.ts`
- Modify: `src/lib/sandboxPrompts.ts`

**Interfaces:**
- Produces: `LandingPageDraft['metadata'].guaranteeBadge?: string` (consumed by Task 1's `renderLandingPageHtml`, already written against this field; consumed by Task 6's panel UI). `SectionRefineSchema`, `LANDING_PAGE_SECTION_REFINE_PROMPT`, `mockSectionRefine(field: string, currentValue: string)` (consumed by Task 3's route).

- [ ] **Step 1: Add the field to `types.ts`**

In `src/components/sandbox/types.ts`, change the `LandingPageDraft` type:

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
    guaranteeBadge?: string;
  };
};
```

- [ ] **Step 2: Re-run Task 1's check now that the type compiles**

Run: `npx tsx scripts/test-landing-page-html.ts`
Expected: `All landing page HTML checks passed`

- [ ] **Step 3: Add schema/prompt/mock to `sandboxPrompts.ts`**

Add near the other landing-page-related exports (alongside `LandingPageSchema`/`mockLandingPage`):

```ts
export const SectionRefineSchema = z.object({
  text: z.string().catch(''),
});

export const LANDING_PAGE_SECTION_REFINE_PROMPT =
  'You are an expert direct-response copywriter making a surgical, targeted edit to one section of an existing landing page. ' +
  "You will be given the section's current text (which may be empty) and an instruction describing the change to make. " +
  'Rewrite ONLY that section per the instruction — do not add commentary, labels, or explanation, and keep roughly the same length as the current text unless the instruction says otherwise. ' +
  'Return a valid JSON object matching this structure exactly: {"text": "the rewritten section text"}.';

export function mockSectionRefine(field: string, currentValue: string): { text: string } {
  const base = currentValue?.trim() || `${field} content`;
  return { text: `[MOCK — set OPENAI_API_KEY for real output] ${base}` };
}
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/types.ts src/lib/sandboxPrompts.ts
git commit -m "feat: add guaranteeBadge field and section-refine prompt/schema/mock"
```

---

### Task 3: `POST /api/sandbox/landing-page/refine-section` route

**Files:**
- Create: `src/app/api/sandbox/landing-page/refine-section/route.ts`
- Create: `scripts/test-landing-page-refine-section-validation.ts`

**Interfaces:**
- Consumes: `brandClauseFor`, `callOpenAiJson`, `LANDING_PAGE_SECTION_REFINE_PROMPT`, `SectionRefineSchema`, `mockSectionRefine` from `@/lib/sandboxPrompts` (Task 2).
- Produces: `POST` handler, request body `{ field: string, currentValue?: string, instruction: string, organizationId?: string }`, response `{ success: true, text: string }` or `{ error: string }` — consumed by Task 6's panel buttons.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server';
import {
  brandClauseFor,
  callOpenAiJson,
  LANDING_PAGE_SECTION_REFINE_PROMPT,
  mockSectionRefine,
  SectionRefineSchema,
} from '@/lib/sandboxPrompts';

export function validateRefineSectionInput(body: any): string | null {
  if (!body || typeof body.field !== 'string' || !body.field.trim()) return 'field is required';
  if (typeof body.instruction !== 'string' || !body.instruction.trim()) return 'instruction is required';
  if (body.currentValue !== undefined && typeof body.currentValue !== 'string') return 'currentValue must be a string';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateRefineSectionInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { field, currentValue = '', instruction, organizationId } = body;

    const userContext = [
      `Section field: ${field}`,
      `Current text: ${currentValue || '(empty)'}`,
      `Instruction: ${instruction}`,
    ].join('\n');

    const brandClause = await brandClauseFor(organizationId);
    const systemPrompt = `${LANDING_PAGE_SECTION_REFINE_PROMPT}\n\n${brandClause}`;

    const result = await callOpenAiJson(
      systemPrompt,
      userContext,
      () => mockSectionRefine(field, currentValue),
      0.7,
      SectionRefineSchema,
    );

    return NextResponse.json({ success: true, text: result.text });
  } catch (err: any) {
    console.error('Sandbox landing-page refine-section error:', err);
    return NextResponse.json({ error: err.message || 'Section refine failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the validation self-check**

```ts
// scripts/test-landing-page-refine-section-validation.ts
import { validateRefineSectionInput } from '../src/app/api/sandbox/landing-page/refine-section/route';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { field: '' }, expectError: true },
  { body: { field: 'heroHeadline' }, expectError: true },
  { body: { field: 'heroHeadline', instruction: '' }, expectError: true },
  { body: { field: 'heroHeadline', instruction: 'make it punchier' }, expectError: false },
  { body: { field: 'subheadline', instruction: 'add urgency', currentValue: 'Call now' }, expectError: false },
  { body: { field: 'subheadline', instruction: 'add urgency', currentValue: 42 }, expectError: true },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateRefineSectionInput(body);
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
console.log('All refine-section validation cases passed');
```

- [ ] **Step 3: Run the check**

Run: `npx tsx scripts/test-landing-page-refine-section-validation.ts`
Expected: `All refine-section validation cases passed`

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sandbox/landing-page/refine-section/route.ts scripts/test-landing-page-refine-section-validation.ts
git commit -m "feat: add landing page section-refine route"
```

---

### Task 4: WordPress route `postType` support

**Files:**
- Modify: `src/app/api/wordpress/route.ts`

**Interfaces:**
- Produces: `POST /api/wordpress` now accepts optional `postType?: 'posts' | 'pages'` in the body (defaults to `'posts'`, so `ContentStudio.tsx`'s existing calls are unaffected) — consumed by Task 7's deploy button.

- [ ] **Step 1: Add the parameter**

```ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { wpUrl, wpUsername, wpAppPassword, title, content, postType } = await req.json();

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      return NextResponse.json({ error: 'Missing WordPress API Credentials' }, { status: 400 });
    }

    const cleanUrl = wpUrl.replace(/\/$/, '');
    const authHeader = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
    const resourcePath = postType === 'pages' ? 'pages' : 'posts';

    const res = await fetch(`${cleanUrl}/wp-json/wp/v2/${resourcePath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`
      },
      body: JSON.stringify({
        title,
        content,
        status: 'draft' // Posts as a draft in wp-admin for review
      })
    });

    const postData = await res.json();

    if (!res.ok) {
      throw new Error(postData.message || 'WordPress REST API error');
    }

    return NextResponse.json({ success: true, postUrl: postData.link });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wordpress/route.ts
git commit -m "feat: support publishing to WordPress pages, not just posts"
```

---

### Task 5: `landing_page.exported` webhook event + deploy route

**Files:**
- Modify: `src/lib/webhooks.ts`
- Create: `src/app/api/sandbox/landing-page/deploy-webhook/route.ts`

**Interfaces:**
- Consumes: `dispatchWebhookEvent(event, payload, organizationId, options?)` from `@/lib/webhooks` (existing).
- Produces: `WebhookEvent` union includes `'landing_page.exported'`. `POST /api/sandbox/landing-page/deploy-webhook` — request body `{ organizationId: string, title: string, html: string, metadata: any }`, response `{ success: true, delivered: boolean }` or `{ error: string }` — consumed by Task 7's deploy button.

- [ ] **Step 1: Extend the event union**

In `src/lib/webhooks.ts`, change:

```ts
export type WebhookEvent =
  | 'lead.created'
  | 'task.sla_breached'
  | 'intake.completed'
  // Creative-sandbox auto-fulfill lifecycle — see src/lib/sandboxAutoFulfill.ts
  | 'asset.staged'
  | 'asset.production'
  | 'asset.failed'
  // Landing Page Studio deploy — see src/app/api/sandbox/landing-page/deploy-webhook/route.ts
  | 'landing_page.exported';
```

- [ ] **Step 2: Write the deploy-webhook route**

```ts
import { NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export function validateDeployWebhookInput(body: any): string | null {
  if (!body || typeof body.organizationId !== 'string' || !body.organizationId.trim()) {
    return 'organizationId is required';
  }
  if (typeof body.title !== 'string' || !body.title.trim()) return 'title is required';
  if (typeof body.html !== 'string' || !body.html.trim()) return 'html is required';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateDeployWebhookInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { organizationId, title, html, metadata } = body;

    const result = await dispatchWebhookEvent(
      'landing_page.exported',
      { title, html, metadata },
      organizationId,
    );

    return NextResponse.json({ success: true, delivered: result.delivered });
  } catch (err: any) {
    console.error('Sandbox landing-page deploy-webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook deploy failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/webhooks.ts src/app/api/sandbox/landing-page/deploy-webhook/route.ts
git commit -m "feat: add landing_page.exported webhook event and deploy route"
```

---

### Task 6: Panel — Inspector fields, live iframe preview, device toggle, section-AI buttons

This is one task, not split further: the device-toggle/iframe preview and the Inspector-field relocation both rewrite the same left-column and right-column JSX in `LandingPageStudioPanel.tsx`, and the fields move from one column to the other. Splitting this into two commits would leave an intermediate state where the fields are deleted from the right column and not yet present in the left one — broken UI a reviewer couldn't sensibly approve on its own.

**Files:**
- Modify: `src/components/sandbox/LandingPageStudioPanel.tsx`

**Interfaces:**
- Consumes: `renderLandingPageHtml` from `./landingPageHtml` (Task 1). `OrgBrand.primaryColor` (existing type, already fetched into `orgs` state in this panel). `POST /api/sandbox/landing-page/refine-section` (Task 3). `fetchGenerationJson` from `@/lib/sandboxClientFetch` (existing import already used by `generate`).
- Produces: left column (Inspector) contains the editable fields + 3 AI refine buttons below the existing "Generate Landing Page" button; right column is preview-only (device toggle + iframe). `previewHtml: string` (the current rendered HTML) — consumed by Task 7's export/deploy toolbar.

- [ ] **Step 1: Add imports and state**

In `src/components/sandbox/LandingPageStudioPanel.tsx`, add to the top imports:

```ts
import { renderLandingPageHtml } from './landingPageHtml';
```

Add `useMemo` to the existing `react` import (`import React, { useState, useEffect, useMemo } from 'react';`).

Inside the component, after the existing `draft` state declaration:

```ts
const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
const selectedOrg = orgs.find((o) => o.id === organizationId);
const previewHtml = useMemo(
  () => (draft ? renderLandingPageHtml(draft, selectedOrg?.primaryColor) : ''),
  [draft, selectedOrg?.primaryColor],
);
const viewportWidth = viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';
```

After the existing `saveToStaged` function, add the section-refine handler:

```ts
const [refiningField, setRefiningField] = useState<string | null>(null);

const refineSection = async (field: string, currentValue: string, instruction: string) => {
  setRefiningField(field);
  try {
    const data = await fetchGenerationJson('/api/sandbox/landing-page/refine-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, currentValue, instruction, organizationId: organizationId || undefined }),
    });
    updateField({ [field]: data.text } as Partial<LandingPageDraft['metadata']>);
    toast.success('Section updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to refine section');
  } finally {
    setRefiningField(null);
  }
};
```

- [ ] **Step 2: Replace the left-column and right-column JSX**

This step replaces both halves of the render at once, since the fields move from one to the other.

**Left column:** after the existing "Generate Landing Page" button (still inside the left Inspector `<div>`, before its closing tag), add the editable fields block, wrapped in `{draft && (...)}`:

```tsx
{draft && (
  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <LayoutPanelTop className="w-4 h-4" />
      <span className="text-[10px] font-mono uppercase">{draft.title}</span>
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Hero Headline</label>
        <button
          onClick={() => refineSection('heroHeadline', draft.metadata.heroHeadline, 'Rewrite this hero headline to be punchier and more compelling')}
          disabled={refiningField === 'heroHeadline'}
          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
        >
          {refiningField === 'heroHeadline' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Rewrite
        </button>
      </div>
      <input
        value={draft.metadata.heroHeadline}
        onChange={(e) => updateField({ heroHeadline: e.target.value })}
        className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
      />
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Subheadline</label>
        <button
          onClick={() => refineSection('subheadline', draft.metadata.subheadline, 'Rewrite this to increase urgency using scarcity or timeliness language, keep roughly the same length')}
          disabled={refiningField === 'subheadline'}
          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
        >
          {refiningField === 'subheadline' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Increase Urgency
        </button>
      </div>
      <textarea
        value={draft.metadata.subheadline}
        onChange={(e) => updateField({ subheadline: e.target.value })}
        rows={2}
        className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
      />
    </div>

    <div className="space-y-2">
      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Value Propositions</label>
      {draft.metadata.valueProps.map((vp, i) => (
        <div key={i} className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            value={vp}
            onChange={(e) => updateValueProp(i, e.target.value)}
            className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200"
          />
        </div>
      ))}
    </div>

    <div className="bg-slate-100 border border-slate-300 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-3 space-y-1.5">
      <Quote className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      <textarea
        value={draft.metadata.testimonial}
        onChange={(e) => updateField({ testimonial: e.target.value })}
        rows={2}
        className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-300 italic focus:outline-none resize-none"
      />
    </div>

    <div className="space-y-1.5">
      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Primary CTA</label>
      <input
        value={draft.metadata.primaryCta}
        onChange={(e) => updateField({ primaryCta: e.target.value })}
        className="w-full bg-indigo-600 text-white text-center text-xs font-bold rounded-lg py-2.5 focus:outline-none"
      />
    </div>

    <button
      onClick={() => refineSection('guaranteeBadge', draft.metadata.guaranteeBadge || '', 'Write a short trust or risk-reversal guarantee badge line for this business, e.g. "100% Satisfaction Guaranteed"')}
      disabled={refiningField === 'guaranteeBadge'}
      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
    >
      {refiningField === 'guaranteeBadge' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      {draft.metadata.guaranteeBadge ? 'Regenerate Guarantee Badge' : 'Add Guarantee Badge'}
    </button>

    <ScoreBadge
      content={draft.content}
      type="LANDING_PAGE"
      metadata={draft.metadata}
      onOptimized={(r) => setDraft((prev) => (prev ? { title: r.title || prev.title, content: r.content, metadata: normalizeMetadata(r.metadata || prev.metadata) } : prev))}
    />

    <button
      onClick={saveToStaged}
      disabled={saving}
      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? 'Saving…' : 'Save to Staged Assets'}
    </button>
  </div>
)}
```

**Right column:** delete the entire existing `{/* RIGHT: Section previews */}` block — the outer `div` with `className="bg-white/85 ... rounded-xl p-6 min-h-[360px] flex flex-col"`, including its inner `draft ? (...) : (...)` ternary that currently holds the same fields being moved above, and the `generationFailed` retry branch nested inside its `else` — and replace it wholesale with the device-toggle bar and iframe. The `generationFailed` retry state is preserved, just relocated into the new empty-state branch:

```tsx
{/* RIGHT: Live Preview */}
<div className="space-y-3">
  <div className="flex items-center gap-2">
    {(['mobile', 'tablet', 'desktop'] as const).map((v) => (
      <button
        key={v}
        onClick={() => setViewport(v)}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
          viewport === v
            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
            : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        {v === 'mobile' ? 'Mobile 375px' : v === 'tablet' ? 'Tablet 768px' : 'Desktop 100%'}
      </button>
    ))}
  </div>
  <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 min-h-[500px] flex items-center justify-center overflow-auto">
    {draft ? (
      <iframe
        srcDoc={previewHtml}
        sandbox="allow-scripts"
        title="Landing page preview"
        style={{ width: viewportWidth, height: '640px', border: 'none', background: 'white' }}
        className="rounded-lg shadow-lg shrink-0"
      />
    ) : generationFailed ? (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
        <button
          onClick={generate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    ) : (
      <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
        Pick a source and generate to see the live preview here.
      </div>
    )}
  </div>
</div>
```

The Primary CTA field is now a plain input (no arrow icon), so `ArrowRight` becomes an unused import — remove it from the top `lucide-react` import line (`LayoutPanelTop` stays, it's reused above; `RefreshCw` stays, reused in the right column's retry state).

`normalizeMetadata` (existing helper) already defaults every field including `valueProps` via `Array.isArray(...) ? ... : []` — extend it to carry `guaranteeBadge` through so `ScoreBadge`'s `onOptimized` and any future full regenerate doesn't drop it:

```ts
function normalizeMetadata(metadata: any): LandingPageDraft['metadata'] {
  return {
    heroHeadline: metadata?.heroHeadline || '',
    subheadline: metadata?.subheadline || '',
    primaryCta: metadata?.primaryCta || '',
    valueProps: Array.isArray(metadata?.valueProps) ? metadata.valueProps : [],
    testimonial: metadata?.testimonial || '',
    guaranteeBadge: metadata?.guaranteeBadge || undefined,
  };
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open the Landing Page Studio tab, generate a draft, confirm fields edit from the left column and the right iframe updates live on every keystroke, and the 3 viewport buttons change the iframe's width. Click Rewrite / Increase Urgency / Add Guarantee Badge with no LLM key set — confirm each writes `[MOCK — ...]` text into its field and the preview updates.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/LandingPageStudioPanel.tsx
git commit -m "feat: add live iframe preview, device toggles, and section-AI refine to Landing Page Studio"
```

---

### Task 7: Panel — export/deploy toolbar

**Files:**
- Modify: `src/components/sandbox/LandingPageStudioPanel.tsx`

**Interfaces:**
- Consumes: `previewHtml` (Task 6, already in scope in this component), `/api/organizations/credentials` (existing GET route, returns `{ wordpressUrl, wordpressUsername, wordpressAppPass, ... }`), `POST /api/wordpress` with `postType: 'pages'` (Task 4), `POST /api/sandbox/landing-page/deploy-webhook` (Task 5).

- [ ] **Step 1: Add toolbar state and handlers**

After the `refineSection` function:

```ts
const [pushingWp, setPushingWp] = useState(false);
const [pushingWebhook, setPushingWebhook] = useState(false);

function slugify(value: string): string {
  return (value || 'landing-page').replace(/\s+/g, '-').toLowerCase();
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const copyHtml = async () => {
  if (!draft) return;
  try {
    await navigator.clipboard.writeText(previewHtml);
    toast.success('Copied HTML to clipboard');
  } catch {
    toast.error('Failed to copy to clipboard');
  }
};

const downloadHtml = () => {
  if (!draft) return;
  downloadTextFile(`${slugify(draft.title)}.html`, previewHtml, 'text/html');
};

const pushToWordpress = async () => {
  if (!draft) return;
  if (!organizationId) {
    toast.error('Select a client organization first');
    return;
  }
  setPushingWp(true);
  try {
    const credsRes = await fetch(`/api/organizations/credentials?organizationId=${organizationId}`);
    const creds = await credsRes.json();
    if (!creds.wordpressUrl || !creds.wordpressUsername || !creds.wordpressAppPass) {
      throw new Error('Missing WordPress credentials in API Vault for this client');
    }
    const res = await fetch('/api/wordpress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wpUrl: creds.wordpressUrl,
        wpUsername: creds.wordpressUsername,
        wpAppPassword: creds.wordpressAppPass,
        title: draft.title,
        content: previewHtml,
        postType: 'pages',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to publish to WordPress');
    toast.success('Draft page created on WordPress');
  } catch (err: any) {
    toast.error(err.message || 'Failed to push to WordPress');
  } finally {
    setPushingWp(false);
  }
};

const pushToWebhook = async () => {
  if (!draft) return;
  if (!organizationId) {
    toast.error('Select a client organization first');
    return;
  }
  setPushingWebhook(true);
  try {
    const res = await fetch('/api/sandbox/landing-page/deploy-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, title: draft.title, html: previewHtml, metadata: draft.metadata }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Webhook push failed');
    toast[data.delivered ? 'success' : 'error'](data.delivered ? 'Delivered to client webhook' : 'Webhook configured but delivery failed — check the listener');
  } catch (err: any) {
    toast.error(err.message || 'Failed to push to webhook');
  } finally {
    setPushingWebhook(false);
  }
};
```

- [ ] **Step 2: Render the toolbar**

Add below the "Save to Staged Assets" button, still inside the `{draft && (...)}` Inspector block from Task 6:

```tsx
<div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
  <button
    onClick={copyHtml}
    className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide"
  >
    Copy Clean HTML
  </button>
  <button
    onClick={downloadHtml}
    className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide"
  >
    Download HTML Bundle
  </button>
  <button
    onClick={pushToWordpress}
    disabled={pushingWp}
    className="py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
  >
    {pushingWp ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
    Push to WordPress
  </button>
  <button
    onClick={pushToWebhook}
    disabled={pushingWebhook}
    className="py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
  >
    {pushingWebhook ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
    Push to Webhook
  </button>
</div>
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Full build**

Run: `npm run build`
Expected: zero errors

- [ ] **Step 5: Manual check**

Run: `npm run dev`. With no org selected, click Push to WordPress / Push to Webhook and confirm the "Select a client organization first" toast. Pick an org, click Copy Clean HTML and Download HTML Bundle, confirm clipboard/file contain the rendered markup. If a test org has WordPress credentials configured in the API Vault, click Push to WordPress and confirm a draft Page appears in `wp-admin`. If a test org has a `webhookUrl` configured (e.g. pointed at a request-bin-style listener), click Push to Webhook and confirm a `landing_page.exported` payload arrives.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/LandingPageStudioPanel.tsx
git commit -m "feat: add Landing Page Studio export/deploy toolbar"
```
