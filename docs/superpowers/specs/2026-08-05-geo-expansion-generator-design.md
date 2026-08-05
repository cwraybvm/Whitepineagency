# Localized Geo-Expansion Generator (Upgrade 1 of 3)

## Goal

A fulfillment-team tool that, given a core service, an offer, and a list of target sub-market locations, generates a per-location bundle of Google RSA headlines/descriptions, Meta ad hooks, and a landing-page H1 — with 1-click CSV export for Google Ads bulk upload.

## Scope decisions

- Standalone new tool, separate from the sandbox's existing "DCO Personalization" mode (`src/components/sandbox/CopyStudioPanel.tsx` + `CopyDcoSchema`). That mode generates a single ad-copy variant per location+segment for sandbox content creators; this tool generates a multi-channel bundle (RSA headlines, descriptions, Meta hooks, LP H1) per location for the fulfillment team. Different audience, different output shape — kept separate rather than extending DCO.
- Ephemeral, no persistence. Matches the Flyer Generator and Master Campaign Panel pattern: generate on demand, copy/export immediately, no new Prisma model.
- Hard-fail on generation error (unlike the intake-to-drive pipeline's soft-fail): this is a direct, on-demand generation call the user is actively waiting on, not a background step after a already-successful upload. A failure should surface as an error toast, not be silently swallowed.

## 1. Schema & prompt — `src/lib/sandboxPrompts.ts`

```ts
const LocalizedAdVariationSchema = z.object({
  location: z.string().catch(''),
  googleHeadlines: z.array(z.string()).catch([]),    // 3 headlines, ≤30 chars each
  googleDescriptions: z.array(z.string()).catch([]), // 2 descriptions, ≤90 chars each
  metaHooks: z.array(z.string()).catch([]),          // 2 hooks
  landingPageH1: z.string().catch(''),
}).catch({ location: '', googleHeadlines: [], googleDescriptions: [], metaHooks: [], landingPageH1: '' });

export const GeoExpansionPackageSchema = z.object({
  variations: z.array(LocalizedAdVariationSchema).catch([]),
});

export type GeoExpansionPackage = z.infer<typeof GeoExpansionPackageSchema>;
```

`GEO_EXPANSION_PROMPT`: instructs the LLM, given a core service, an offer, and a list of target sub-market locations, to return one `LocalizedAdVariationSchema` object per location: exactly 3 Google RSA headlines (≤30 chars), 2 descriptions (≤90 chars), 2 Meta ad hooks, and 1 landing-page H1 — each tailored to that specific sub-market, not a generic copy-paste across locations.

`mockGeoExpansionPackage(locations: string[], coreService: string, offer: string): GeoExpansionPackage` returns placeholder data per location, following the same shape and truncation pattern as `mockMasterCampaignPackage`, for use as the `callOpenAiJson` fallback when no provider API key is configured.

## 2. API route — `src/app/api/fulfillment/geo-expansion/route.ts`

```
POST { coreService: string, offer: string, locations: string[], brandName?: string }
```

- Validates `coreService`, `offer`, and a non-empty `locations` array; 400 if any are missing/empty.
- Builds `userContext` from all four fields.
- Calls `callOpenAiJson(GEO_EXPANSION_PROMPT, userContext, () => mockGeoExpansionPackage(locations, coreService, offer), 0.7, GeoExpansionPackageSchema)`.
- Returns `{ success: true, variations }` on success, `{ error }` with 500 on failure.

Structurally mirrors `src/app/api/sandbox/master-campaign/route.ts`.

## 3. UI page — `src/app/(fulfillment)/fulfillment/geo-expansion/page.tsx`

Styled like `src/app/(fulfillment)/fulfillment/flyer-generator/page.tsx` (dark slate-900 cards, sky accent, `grid-cols-[380px_1fr]` layout, mono uppercase labels).

**Left (controls):**
- Service input (text)
- Offer details textarea
- Locations textarea, one location per line (placeholder: `"Austin, TX\nRound Rock, TX\nCedar Park, TX"`), split on newlines into the `locations` array before POST
- Generate button: `Loader2` spinner while pending, disabled when service/offer/locations are empty

**Right (results):** one card per returned location:
- 3 Google RSA headlines, each with a 30-char-limit badge (red when over, matching `CharLimitBadges`' over/under styling — implemented locally to this page since `sandbox/types.ts`'s `CHAR_LIMITS` is scoped to sandbox tools)
- 2 descriptions, each with a 90-char-limit badge
- 2 Meta ad hooks
- Landing page H1
- Per-card `CopyButton` (reusing `src/components/sandbox/CopyButton.tsx`) copying the full card as plain text

**Action buttons (above or beside the results grid):**
- "Copy CSV for Google Ads" — builds a CSV string with header `Location,Headline 1,Headline 2,Headline 3,Description 1,Description 2`, one row per location, and copies it via `navigator.clipboard.writeText`
- "Copy All to Clipboard" — flattens every location's full bundle into readable plain text and copies it

## 4. Navigation wiring

Add a "Geo" quick-tool button to `src/app/(fulfillment)/fulfillment/page.tsx`, in the per-task quick-tools row next to the existing "Flyer" and "Onboard" buttons (around line 594-615), using the same `router.push(...)` pattern, pointing at `/fulfillment/geo-expansion`.

## 5. Verification

`npx tsc --noEmit` — zero type errors.

No new tests: this follows the same untested pattern as the Flyer Generator and Master Campaign Panel — client-side generation tools with no existing test coverage in this repo (no test runner configured).
