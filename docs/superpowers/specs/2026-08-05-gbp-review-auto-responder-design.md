# GBP Review Auto-Responder (Upgrade 2 of 3)

## Goal

A client-portal tool that drafts a warm, brand-aligned, SEO-aware public reply to a Google Business Profile review — handling both 5-star praise and empathetic, professional responses to 1-3 star negative reviews.

## Scope decisions

- Route is `/portal/reviews`, exactly as specced. That path currently has three dead references expecting a different feature (dashboard's "Review Pass Sign" button, admin nav's "Review Request System" hint — both about *soliciting* reviews via QR/SMS, not *responding* to them). Fixing those dead links or disambiguating the naming is out of scope for this task; this spec fills the previously-empty route.
- Ephemeral, no persistence — matches the Geo-Expansion Generator and Master Campaign Panel pattern. No new Prisma model.
- Hard-fail on generation error — same as Geo-Expansion: a direct, on-demand generation call the user is actively waiting on, not a background step. Failure surfaces as an error toast.
- UI follows the visual pattern already established by `/portal/dashboard/page.tsx` (dark slate-900 cards, `--portal-primary` CSS var sourced from `/api/portal/branding`), not the `portal/layout.tsx` header comment's stale "light-mode default" note — the sibling page already overrides that in practice and this page should look consistent with it, not with an outdated doc comment.

## 1. Schema & prompt — `src/lib/sandboxPrompts.ts`

```ts
export const GbpReviewResponseSchema = z.object({
  replyText: z.string().catch(''),
  seoKeywordsIncluded: z.array(z.string()).catch([]),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).catch('NEUTRAL'),
  recommendedAction: z.string().catch(''),
});

export type GbpReviewResponse = z.infer<typeof GbpReviewResponseSchema>;
```

`GBP_REVIEW_RESPONDER_PROMPT`: given `reviewText`, `starRating`, and optional `location`, `serviceKeyword`, `brandName`, instructs the LLM to:
- Write a warm, brand-aligned public reply that naturally integrates the location name and service keyword where it fits (for local SEO), without forcing keywords in unnaturally.
- Report which of the given keywords actually appear in `seoKeywordsIncluded`.
- Classify `sentiment` from the review text itself, not just the star count (a 5-star review can still read sarcastic or lukewarm).
- For 1-3 star reviews: an empathetic, professional, non-defensive reply that acknowledges the concern and invites the customer to resolve offline — never admitting fault or liability.
- For 4-5 star reviews: genuine, specific thanks (avoid generic "Thank you for your feedback!" boilerplate).
- Populate `recommendedAction` with internal ops guidance (e.g. "No follow-up needed" for glowing reviews, "Escalate to manager for a phone call" for serious complaints).

`mockGbpReviewResponse(reviewText: string, starRating: number, location?: string, serviceKeyword?: string): GbpReviewResponse` — placeholder fallback for the no-API-key `callOpenAiJson` mock path, following the same `[MOCK]`-prefixed pattern as `mockGeoExpansionPackage`.

## 2. API route — `src/app/api/portal/reviews/route.ts`

```
POST { reviewText: string, starRating: number, location?: string, serviceKeyword?: string, brandName?: string }
```

- Validates `reviewText` is non-empty and `starRating` is an integer 1-5; 400 otherwise.
- Builds `userContext` from all fields.
- Calls `callOpenAiJson(GBP_REVIEW_RESPONDER_PROMPT, userContext, () => mockGbpReviewResponse(reviewText, starRating, location, serviceKeyword), 0.7, GbpReviewResponseSchema)`.
- Returns `{ success: true, ...result }` on success, `{ error }` with 500 on failure.

Structurally mirrors `src/app/api/fulfillment/geo-expansion/route.ts`.

## 3. UI page — `src/app/(client)/portal/reviews/page.tsx`

Follows `/portal/dashboard/page.tsx`'s pattern: fetches `/api/portal/branding` for `businessName`/`primaryColor`/`logoUrl`, sets `--portal-primary` CSS var, dark slate-900/slate-950 cards.

**Left (controls):**
- 1-5 clickable star selector (filled/outline `Star` icons)
- Customer review textarea
- Optional location input (placeholder `"e.g. Round Rock, TX"`)
- Optional service keyword input (placeholder `"e.g. AC repair"`)
- Generate button: disabled until review text is non-empty and a star rating is selected; `Loader2` spinner while pending

**Right (result):**
- Reply text card
- `seoKeywordsIncluded` rendered as small badges
- Sentiment badge: green for POSITIVE, slate for NEUTRAL, red for NEGATIVE
- `recommendedAction` line
- `CopyButton` (reusing `src/components/sandbox/CopyButton.tsx`) on the reply text

## 4. Verification

`npx tsc --noEmit` and `npm run build` — zero errors, no client/server bundle boundary regressions (the page imports only `type { GbpReviewResponse }` from `sandboxPrompts.ts`, matching the pattern fixed in `src/lib/brandDna.ts` for `toBrandDna`).

No new tests: same untested-ephemeral-tool pattern as Geo-Expansion Generator and Master Campaign Panel.
