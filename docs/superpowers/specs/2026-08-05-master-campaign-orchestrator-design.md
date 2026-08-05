# 30-Day Master Campaign Orchestrator Design

**Goal:** A new Sandbox tab that generates a ready-to-run, multi-channel campaign bundle (Meta Ads, Google Search Ads, Google Business Posts, Video Scripts, Email/SMS Blasts) from a location + promo offer + the active Brand DNA, and exports it as a client-ready HTML portal, Markdown brief, or raw JSON.

**Cadence decision:** "30-Day" describes the flight window the bundle is meant to run across, not 30 dated entries per channel. Each channel gets a small handful of ready-to-run assets — matches the existing Campaign Engine's scale (one ad, one video, one drip sequence) and keeps one LLM call tractable: 3 Meta ad variants, 3 Google Search ad variants, 4 Google Business posts (weekly), 2 video scripts, 3-5 email/SMS touches.

**Non-goals:** No day-by-day calendar UI. No staging/save-to-assets — this is a generated deliverable to export, not an editable draft canvas (no beat editor, no per-card save button). No `organizationId`/`brandClauseFor` org-persisted brand lookup — this route is purely driven by the already-built `activeBrandDna` cross-tab state, matching the task's literal request shape.

## Architecture

### 1. Schema & prompt — `src/lib/sandboxPrompts.ts` (extend)

Two small new module-private schemas (no existing shape fits):

```ts
const GoogleSearchAdSchema = z.object({
  headline: z.string().catch(''),
  description: z.string().catch(''),
}).catch({ headline: '', description: '' });

const GoogleBusinessPostSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
}).catch({ title: '', content: '' });
```

Everything else reuses existing schemas — `AdBuilderSchema` for Meta ads, `VideoLabSchema` for video scripts, and `DripStepSchema` (already exactly `{day, channel, content}`) for email/SMS touches:

```ts
export const MasterCampaignPackageSchema = z.object({
  metaAds: z.array(AdBuilderSchema.catch(DEFAULT_DRAFT)).catch([]),
  googleSearchAds: z.array(GoogleSearchAdSchema).catch([]),
  googleBusinessPosts: z.array(GoogleBusinessPostSchema).catch([]),
  videoScripts: z.array(VideoLabSchema.catch(DEFAULT_DRAFT)).catch([]),
  emailSmsBlasts: z.array(DripStepSchema).catch([]),
});

export type MasterCampaignPackage = z.infer<typeof MasterCampaignPackageSchema>;
```

`MASTER_CAMPAIGN_PROMPT` instructs the LLM to produce that exact bundle from a supplied location and promo offer, with the counts above per channel. Brand DNA is not manually concatenated into the prompt — it arrives through the same `<brand_dna>` injection path (`callOpenAiJson`'s existing `brandDna` argument) already wired for Copy Studio/Ad Builder/Video Lab/Campaign Engine.

`mockMasterCampaignPackage(location, promoOffer)` follows the established `[MOCK]`-prefix fallback convention, populating all 5 arrays with plausible placeholder content.

### 2. Route — `src/app/api/sandbox/master-campaign/route.ts` (new)

```ts
export async function POST(req: Request) {
  try {
    const { location, promoOffer, activeBrandDna } = await req.json();
    if (!location || !promoOffer) {
      return NextResponse.json({ error: 'location and promoOffer are required' }, { status: 400 });
    }
    const userContext = `Location: ${location}\nPromo offer: ${promoOffer}`;
    const result = await callOpenAiJson(
      MASTER_CAMPAIGN_PROMPT,
      userContext,
      () => mockMasterCampaignPackage(location, promoOffer),
      0.7,
      MasterCampaignPackageSchema,
      activeBrandDna,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox master-campaign error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
```

### 3. Exporters — `src/lib/masterCampaignExport.ts` (new)

- `buildMasterCampaignMarkdown(pkg: MasterCampaignPackage, location: string, promoOffer: string): string` — sectioned report (one heading per channel, bulleted/quoted entries), same style as the existing `buildSwipeFileMarkdown`.
- `buildMasterCampaignHtml(pkg: MasterCampaignPackage, location: string, promoOffer: string, brandName?: string): string` — one self-contained HTML document: inline `<style>`, a small inline `<script>` that toggles which channel section is visible (click a nav button → show its section, hide the rest — same interaction as the panel's own sub-tabs), and a local `escapeHtml()` helper applied to every piece of interpolated LLM/user text so generated copy can never break the markup structure.
- JSON export needs no builder — `JSON.stringify(pkg, null, 2)` inline at the call site, matching the swipe-file exporter's precedent for trivial serialization.

### 4. UI — `src/components/sandbox/MasterCampaignPanel.tsx` (new)

Same left-controls / right-results grid as every other generation panel:

- **Left:** Location input, Promo Offer input, "Generate 30-Day Campaign" button (`Loader2` while generating), `ActiveBrandDnaBadge` rendered when the `activeBrandDna` prop is set (read-only, wired the same way as the other 4 generation panels — required for the route's brand-context param to do anything from the UI).
- **Right, once a package exists:** 5 channel sub-tabs (Meta Ads / Google Search / Google Business / Video Scripts / Email & SMS) — local `useState<Channel>` toggle, not a page-level `SandboxTool`. Each tab renders its array as read-only cards with a `CopyButton` per card (reused as-is) — no editing, no per-card save, no beat editor for video scripts (title + content + beat count only).
- **Export:** dropdown menu (same hand-rolled blur-to-close pattern as Brand Identity's Export Swipe File menu) with three items: Download HTML Portal (`.html`), Download Markdown (`.md`), Download JSON (`.json`) — all client-side Blob downloads, no server round-trip beyond the initial generation.

### 5. Wiring — `types.ts` + `page.tsx` (extend)

- `SandboxTool` gains `'master-campaign'`.
- `TABS` gains `{ id: 'master-campaign', label: '30-Day Campaign', icon: Calendar }` — `Calendar`, not `Rocket`, since Campaign Engine already uses `Rocket` and two identical tab icons would be confusing.
- `page.tsx` renders `<MasterCampaignPanel activeBrandDna={activeBrandDna} />` when active. Not added to `BrandIdentityPanel`'s verbal-track insert-target list — this panel has two separate input fields (Location/Promo Offer), no single obvious brief field for a mined phrase to land in.

## Error handling

Route: 400 for missing `location`/`promoOffer`, 500 for anything unexpected — matches every other sandbox generation route. `callOpenAiJson` degrades to the mock fallback when no provider key is set and never throws on malformed model output (per-field `.catch()` defaults, whole-object fallback to schema defaults on total garbage). Component: fetch failures surface via `toast.error`, generating state resets in a `finally` block — matches every other panel's async-action pattern.

## Testing

- `npx tsc --noEmit` — zero errors.
- Manual: with no LLM provider key set, generate a package for a location + promo offer, confirm all 5 channel tabs render `[MOCK]`-prefixed content, apply an active Brand DNA first and confirm the badge shows, then download all 3 export formats and confirm each opens/parses correctly (HTML portal's tab switching works, Markdown reads cleanly, JSON is valid).
