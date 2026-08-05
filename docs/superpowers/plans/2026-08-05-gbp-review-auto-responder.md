# GBP Review Auto-Responder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-portal tool at `/portal/reviews` that drafts a warm, brand-aligned, SEO-aware public reply to a Google Business Profile review, given the review text, star rating, and optional location/service keyword.

**Architecture:** A new Zod schema and prompt in `src/lib/sandboxPrompts.ts` (mirroring `GeoExpansionPackageSchema`/`GEO_EXPANSION_PROMPT`), driven by a new `/api/portal/reviews` route calling the existing `callOpenAiJson` helper, surfaced through a new client page at `/portal/reviews` styled like `/portal/dashboard/page.tsx`.

**Tech Stack:** Next.js API routes, TypeScript, Zod, React (client components), lucide-react icons, sonner toasts.

## Global Constraints

- No test framework in this repo — verification is `npx tsc --noEmit` and `npm run build`.
- Ephemeral only — no Prisma model, no persistence.
- Hard-fail on generation error — the route returns 500, the page shows an error toast.
- Client components must only import **types** from `src/lib/sandboxPrompts.ts` (`import type { ... }`), never runtime values — that file's top level imports `@/lib/prisma`, and a runtime import pulls `pg`/Node built-ins into the client bundle and breaks `npm run build` (this exact bug was just fixed for `toBrandDna` by extracting it to `src/lib/brandDna.ts`; don't reintroduce the pattern here).

---

### Task 1: Add `GbpReviewResponseSchema`, `GBP_REVIEW_RESPONDER_PROMPT`, and mock fallback

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (insert after line 1082, right after `mockGeoExpansionPackage`'s closing brace, before `const ComplianceViolationSchema` at line 1084)

**Interfaces:**
- Consumes: `z` (already imported at top of file).
- Produces: `GbpReviewResponseSchema` (Zod schema), `GbpReviewResponse` (type), `GBP_REVIEW_RESPONDER_PROMPT` (string), `mockGbpReviewResponse(reviewText: string, starRating: number, location?: string, serviceKeyword?: string): GbpReviewResponse` — all consumed by Task 2's API route.

- [ ] **Step 1: Insert the schema, prompt, and mock function**

Insert this block immediately after line 1082 (`}` closing `mockGeoExpansionPackage`) and before line 1084 (`const ComplianceViolationSchema = z`):

```ts
export const GbpReviewResponseSchema = z.object({
  replyText: z.string().catch(''),
  seoKeywordsIncluded: z.array(z.string()).catch([]),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).catch('NEUTRAL'),
  recommendedAction: z.string().catch(''),
});

export type GbpReviewResponse = z.infer<typeof GbpReviewResponseSchema>;

export const GBP_REVIEW_RESPONDER_PROMPT =
  'You are a Google Business Profile review response specialist for a local-service marketing agency. ' +
  'Given a customer review, its star rating, and optionally a location and a core service keyword, write a public reply. ' +
  'Naturally weave in the location name and service keyword where they genuinely fit, for local SEO benefit — never force ' +
  'a keyword in if it reads unnaturally. List whichever of those keywords actually ended up in the reply as seoKeywordsIncluded. ' +
  'Judge sentiment from the review text itself, not just the star rating — a 5-star review can still read sarcastic or lukewarm; ' +
  'a 3-star review can be genuinely warm. For 1-3 star reviews: reply with empathy, professionalism, and no defensiveness — ' +
  'acknowledge the concern specifically, and invite the customer to resolve it offline (e.g. a phone number or email), ' +
  'without ever admitting fault or legal liability. For 4-5 star reviews: give genuine, specific thanks that references ' +
  'something concrete from their review — avoid generic boilerplate like "Thank you for your feedback!". Also produce ' +
  'recommendedAction: brief internal guidance for the business owner, e.g. "No follow-up needed" for glowing reviews, or ' +
  '"Escalate to manager for a phone call" for serious complaints. ' +
  'Return a valid JSON object matching this structure exactly: {"replyText": "the public reply", ' +
  '"seoKeywordsIncluded": ["keyword actually used in the reply"], "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE", ' +
  '"recommendedAction": "brief internal guidance for the business owner"}.';

export function mockGbpReviewResponse(
  reviewText: string,
  starRating: number,
  location?: string,
  serviceKeyword?: string,
): GbpReviewResponse {
  const positive = starRating >= 4;
  const loc = location || 'your area';
  const service = serviceKeyword || 'our service';
  return {
    replyText: positive
      ? `[MOCK] Thank you so much for the kind words! We're thrilled we could help with ${service} in ${loc}. It means a lot to our team.`
      : `[MOCK] We're sorry to hear about your experience with ${service} in ${loc}. This isn't the standard we hold ourselves to — please reach out to us directly so we can make it right.`,
    seoKeywordsIncluded: [location, serviceKeyword].filter((v): v is string => Boolean(v)),
    sentiment: positive ? 'POSITIVE' : starRating === 3 ? 'NEUTRAL' : 'NEGATIVE',
    recommendedAction: positive ? 'No follow-up needed' : 'Escalate to manager for a phone call',
  };
}

```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `sandboxPrompts.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add GBP review response schema, prompt, and mock fallback"
```

---

### Task 2: API route — `src/app/api/portal/reviews/route.ts`

**Files:**
- Create: `src/app/api/portal/reviews/route.ts`

**Interfaces:**
- Consumes: `GBP_REVIEW_RESPONDER_PROMPT`, `callOpenAiJson`, `mockGbpReviewResponse`, `GbpReviewResponseSchema` from `src/lib/sandboxPrompts.ts` (Task 1).
- Produces: `POST /api/portal/reviews` — request `{ reviewText: string, starRating: number, location?: string, serviceKeyword?: string, brandName?: string }`, success response `{ success: true, replyText, seoKeywordsIncluded, sentiment, recommendedAction }`, error response `{ error: string }` with status 400 (bad input) or 500 (generation failure). Consumed by Task 3's page.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server';
import { GBP_REVIEW_RESPONDER_PROMPT, callOpenAiJson, mockGbpReviewResponse, GbpReviewResponseSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { reviewText, starRating, location, serviceKeyword, brandName } = await req.json();

    if (!reviewText || typeof reviewText !== 'string' || !reviewText.trim()) {
      return NextResponse.json({ error: 'reviewText is required' }, { status: 400 });
    }
    if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) {
      return NextResponse.json({ error: 'starRating must be an integer from 1 to 5' }, { status: 400 });
    }

    const userContext = [
      `Review text: ${reviewText}`,
      `Star rating: ${starRating}/5`,
      location ? `Location: ${location}` : '',
      serviceKeyword ? `Core service keyword: ${serviceKeyword}` : '',
      brandName ? `Brand name: ${brandName}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOpenAiJson(
      GBP_REVIEW_RESPONDER_PROMPT,
      userContext,
      () => mockGbpReviewResponse(reviewText, starRating, location, serviceKeyword),
      0.7,
      GbpReviewResponseSchema,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('GBP review response error:', err);
    return NextResponse.json({ error: err.message || 'Review response generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `api/portal/reviews/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/portal/reviews/route.ts
git commit -m "feat: add GBP review auto-responder API route"
```

---

### Task 3: UI page — `src/app/(client)/portal/reviews/page.tsx`

**Files:**
- Create: `src/app/(client)/portal/reviews/page.tsx`

**Interfaces:**
- Consumes: `POST /api/portal/reviews` from Task 2; `type { GbpReviewResponse }` (type-only import) from `src/lib/sandboxPrompts.ts`; `GET /api/portal/branding` (existing route, same shape consumed by `/portal/dashboard/page.tsx`: `{ name, logoUrl, primaryColor }`); `CopyButton` from `src/components/sandbox/CopyButton.tsx`.
- Produces: page rendered at route `/portal/reviews` (final task — nothing consumed by a later task).

- [ ] **Step 1: Write the page**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Star, Loader2, Sparkles, MessageSquareText } from 'lucide-react';
import type { GbpReviewResponse } from '@/lib/sandboxPrompts';
import CopyButton from '@/components/sandbox/CopyButton';

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_PRIMARY = '#0284C7';

const SENTIMENT_STYLES: Record<GbpReviewResponse['sentiment'], string> = {
  POSITIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  NEUTRAL: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  NEGATIVE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function ReviewResponderPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [location, setLocation] = useState('');
  const [serviceKeyword, setServiceKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GbpReviewResponse | null>(null);

  useEffect(() => {
    fetch('/api/portal/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBranding(data))
      .catch(() => {});
  }, []);

  const primaryColor = branding?.primaryColor || DEFAULT_PRIMARY;
  const canGenerate = reviewText.trim() && starRating > 0 && !generating;

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/portal/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText,
          starRating,
          location: location || undefined,
          serviceKeyword: serviceKeyword || undefined,
          brandName: branding?.name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      const { success, ...rest } = data;
      setResult(rest as GbpReviewResponse);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate review reply');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans text-slate-100"
      style={{ ['--portal-primary' as string]: primaryColor }}
    >
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <span
          className="text-xs font-bold uppercase tracking-widest font-mono block flex items-center gap-1.5"
          style={{ color: 'var(--portal-primary)' }}
        >
          <MessageSquareText className="w-3.5 h-3.5" /> REPUTATION MANAGEMENT
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">GBP Review Auto-Responder</h1>
        <p className="text-xs text-slate-400">
          Draft a warm, brand-aligned, SEO-aware reply to any Google Business Profile review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* LEFT: Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Review Details</h2>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Star Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStarRating(n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  className="p-0.5"
                >
                  <Star
                    className="w-6 h-6"
                    style={
                      n <= starRating
                        ? { fill: 'var(--portal-primary)', color: 'var(--portal-primary)' }
                        : undefined
                    }
                    strokeWidth={1.5}
                    color={n <= starRating ? undefined : '#475569'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Customer Review</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              placeholder="Paste the customer's review text here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Round Rock, TX"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Core Service Keyword (optional)</label>
            <input
              value={serviceKeyword}
              onChange={(e) => setServiceKeyword(e.target.value)}
              placeholder="e.g. AC repair"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full py-2.5 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: 'var(--portal-primary)' }}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate Reply'}
          </button>
        </div>

        {/* RIGHT: Result */}
        <div>
          {!result ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-400 text-sm">
              Enter a review and star rating, then Generate Reply to see the draft here.
            </div>
          ) : (
            <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <CopyButton text={result.replyText} />

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${SENTIMENT_STYLES[result.sentiment]}`}>
                  {result.sentiment}
                </span>
                {result.seoKeywordsIncluded.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-slate-800/60 text-slate-300 border-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>

              <p className="text-sm text-slate-100 whitespace-pre-wrap">{result.replyText}</p>

              <div className="pt-3 border-t border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Recommended Action</span>
                <p className="text-xs text-slate-300">{result.recommendedAction}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `portal/reviews/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(client)/portal/reviews/page.tsx"
git commit -m "feat: add GBP review auto-responder UI page"
```

---

### Task 4: Full verification

**Files:** none (verification-only task).

**Interfaces:** none — final task.

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: build succeeds, `/portal/reviews` appears in the route output, no client/server bundle boundary errors (confirms the type-only import of `GbpReviewResponse` in Task 3's page doesn't pull `@/lib/prisma` into the client bundle).

No commit for this task — it's verification of Tasks 1-3's already-committed work.

---

## Self-Review Notes

- Spec coverage: schema/prompt/mock (Task 1), API route (Task 2), UI page with star selector, sentiment badge, SEO keyword badges, recommended action, copy button (Task 3), `tsc --noEmit` + `npm run build` verification (Task 4) — all four spec sections covered.
- No placeholders: every step has literal, complete code and exact file paths/line anchors.
- Type consistency: `GbpReviewResponse['sentiment']` used in Task 3's `SENTIMENT_STYLES` record derives directly from `GbpReviewResponseSchema` defined in Task 1. `reviewText`/`starRating`/`location`/`serviceKeyword`/`brandName` field names match exactly between Task 2's route body and Task 3's fetch call.
