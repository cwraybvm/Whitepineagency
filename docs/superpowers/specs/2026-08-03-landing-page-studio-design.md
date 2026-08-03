# Landing Page Matching Studio — Design

## Goal
Add a "Landing Page Studio" tool to `/sandbox` that generates a full landing-page copy set (hero headline, subheadline, primary CTA, 3 value-prop bullets, social-proof testimonial) matched to either an existing staged creative asset's hook or a fresh brief, with inline editing, live quality scoring, and one-click staging as a `LANDING_PAGE` asset.

## API

New route: `POST /api/sandbox/landing-page` (`src/app/api/sandbox/landing-page/route.ts`)

Two request shapes:
- `{ mode: 'asset', assetId: string, organizationId?: string }` — loads the named `CreativeAsset` (any type) via `prisma.creativeAsset.findUnique`, and passes its `title`/`content`/`metadata` into the prompt as the ad/hook to match.
- `{ mode: 'brief', prompt: string, organizationId?: string }` — passes a free-typed brief, same shape every other sandbox tool already accepts.

Both modes call `brandClauseFor(organizationId)` and `callOpenAiJson(systemPrompt, userContext)` from `src/lib/sandboxPrompts.ts` — no new AI-calling code path.

Response: `{ success: true, title: string, content: string, metadata: { heroHeadline: string, subheadline: string, primaryCta: string, valueProps: [string, string, string], testimonial: string } }`. `content` holds the subheadline (mirrors AD's split of `metadata.headline` + `content` body).

New prompt constant in `sandboxPrompts.ts`:
```
LANDING_PAGE_PROMPT = 'You are an expert direct-response landing page copywriter for a local-service marketing agency. Given either a source ad/hook to match or a brief, write a matching landing page copy set: a hero headline that echoes the source hook, a supporting subheadline, a primary CTA button label, exactly 3 value-proposition bullets, and one social-proof testimonial. Write the testimonial as a short, generic, clearly-placeholder quote attributed to a role and location (e.g. "— Homeowner, Springfield"), never a fabricated named individual — a real client quote replaces it before publishing. Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the subheadline", "metadata": {"heroHeadline": "...", "subheadline": "...", "primaryCta": "...", "valueProps": ["...", "...", "..."], "testimonial": "..."}}.'
```

## Scoring integration

Extend the existing shared scorer (`src/lib/creativeScore.ts`), not a parallel one:
- `ScorableType` gains `'LANDING_PAGE'`.
- `hookTextFor`: add `if (type === 'LANDING_PAGE') return metadata?.heroHeadline || firstSentence(content);`
- `ctaTextFor`: add `if (type === 'LANDING_PAGE') return metadata?.primaryCta || lastSentence(content);`
- `scoreCompliance`: `LANDING_PAGE` returns `{ points: 25, ok: true }` unconditionally (same treatment as `VIDEO_SCRIPT`) — there's no fixed external character limit for a landing page the way SMS/Google/Meta have one, so inventing a soft limit isn't warranted.

Also add `'LANDING_PAGE'` to `VALID_SCORABLE_TYPES` in `src/app/api/sandbox/generate/route.ts` and route it through `basePromptForType` (returning `LANDING_PAGE_PROMPT`), so the existing `ScoreBadge` Auto-Optimize button works on this tool without any new optimize code path.

## Types

`src/components/sandbox/types.ts`:
- `SandboxTool` gains `'landing-page'`.
- New: `export type LandingPageDraft = { title: string; content: string; metadata: { heroHeadline: string; subheadline: string; primaryCta: string; valueProps: string[]; testimonial: string } };`

## UI

New component `src/components/sandbox/LandingPageStudioPanel.tsx`, following the existing two-column panel pattern (`AdBuilderPanel`/`VideoLabPanel`):

**Left (controls):**
- Source-mode toggle: "From Staged Asset" vs "From Brief".
  - Staged Asset mode: a `<select>` populated from `GET /api/sandbox/assets` (unfiltered — any staged asset can seed a matching LP), storing the picked `assetId`.
  - Brief mode: a textarea, same as every other panel's Brief field.
- Org picker for Brand DNA, fetched from `/api/sandbox/organizations` (same pattern as `AdBuilderPanel`'s `organizationId` state).
- "Generate Landing Page" button → `POST /api/sandbox/landing-page` with the active mode's payload.

**Right (section previews, inline-editable):**
- Hero Headline — large text, editable in place.
- Subheadline — editable.
- 3 Value Proposition bullets — editable list.
- Testimonial — quote-styled block, editable.
- Primary CTA — rendered as a button preview, editable.
- All editable via a local `updateField(patch: Partial<LandingPageDraft['metadata']>)` helper using functional `setDraft`, mirroring `VideoLabPanel`'s `updateBeat` (including its functional-update fix — no stale-closure risk here since this task starts from that lesson).
- `ScoreBadge` (`content=draft.content`, `type="LANDING_PAGE"`, `metadata=draft.metadata`, `onOptimized` updates the draft) underneath the previews.
- "Save to Staged Assets" button → `POST /api/sandbox/assets` with `type: 'LANDING_PAGE'`, `title: draft.title`, `content: draft.content`, `metadata: draft.metadata`. No new persistence path.

**Wiring into `src/app/(sandbox)/sandbox/page.tsx`:**
- Add `{ id: 'landing-page', label: 'Landing Page Studio', icon: LayoutPanelTop }` to `TABS`.
- Import and render `LandingPageStudioPanel` when `activeTool === 'landing-page'`.

**Wiring into `src/components/sandbox/StagedAssetsList.tsx`:**
- Add `'landing-page': 'LANDING_PAGE'` to the `TOOL_TYPE` map so the Staged Assets view filters correctly for this tool.

## Error handling

Same conventions as every existing sandbox route: 400 for missing/invalid input (missing `prompt` in brief mode, missing/unfound `assetId` in asset mode), 500 with `err.message` fallback for upstream OpenAI failures.

## Testing

No test framework in this repo (matches the voiceover branch's precedent). The one meaningful runnable check is a standalone script exercising the route's input validation across both modes (missing `prompt`, missing `assetId`, non-existent `assetId`, valid brief, valid asset) — same style as `scripts/test-generate-voice-validation.ts`.

## Out of scope
- Editing/reordering value-prop bullets beyond exactly 3.
- Any live preview of the actual rendered landing page (HTML/visual mockup) beyond the in-app section-card preview.
- Promoting a `LANDING_PAGE` asset anywhere beyond the existing generic Staged Assets promote flow.
