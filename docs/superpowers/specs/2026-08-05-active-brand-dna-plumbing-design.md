# Active Brand DNA Plumbing Across Sandbox Tabs Design

**Goal:** Let a mined `ExtractedBrandIdentity` (from the Brand Identity tab) become an active, cross-tab brand context that automatically flows into Copy Studio, Ad Builder, Video Lab, and Campaign Engine generation calls, plus let individual Key Verbal Tracks be inserted directly into a chosen generation tool's brief field.

**Key finding:** `sandboxPrompts.ts` already has unused `<brand_dna>` XML-injection plumbing — `BrandDna` interface, `formatBrandDnaBlock`, `injectBrandDna`, and a `brandDna?: BrandDna` 6th parameter on `callOpenAiJson`/`callOpenAiVisionJson` — built but never called from any route. Every route today only uses the separate, unrelated plain-text `brandClauseFor(organizationId)` clause (a server-side Prisma lookup keyed by the panel's own `organizationId` selector). This task wires the dormant `<brand_dna>` path up, **additively** — it does not touch or replace `brandClauseFor`; both can be present in a system prompt at once, and `formatBrandDnaBlock`'s own text already tells the model the `<brand_dna>` block overrides on conflict.

**Non-goals:** No change to `refine`/`dco` generation modes (task scope is copy/ad/video/campaign-batch generation only). No lifting of each panel's `prompt`/`campaignGoal`/`organizationId` local state — that stays exactly as-is per the existing architectural precedent (see `BrandDnaHud.tsx`'s own comment on why org state isn't lifted). No persistence of `activeBrandDna` — it's page-level React state, cleared on full page reload, same lifetime as everything else in the Sandbox draft canvas.

## Architecture

### 1. Mapping helper — `src/lib/sandboxPrompts.ts` (extend)

```ts
export function toBrandDna(identity: ExtractedBrandIdentity): BrandDna {
  return {
    brandName: identity.brandName || undefined,
    toneOfVoice: identity.brandVoice || undefined,
    targetAudience: identity.targetAudienceProfile || undefined,
    coreValueProp: identity.coreValueProps.length ? identity.coreValueProps.join('; ') : undefined,
  };
}
```

`keyVerbalTracks` and `activeAdAngles` are deliberately excluded from the mapping — they're copy material for the brief, not tone/audience override rules, so they flow through the separate insertion mechanism (below) instead of the `<brand_dna>` block.

### 2. Shared state — `src/app/(sandbox)/sandbox/page.tsx` (extend)

Two new pieces of lifted state:

```ts
const [activeBrandDna, setActiveBrandDna] = useState<BrandDna | null>(null);
const [pendingInsert, setPendingInsert] = useState<{ tool: SandboxTool; text: string } | null>(null);
```

Passed down:
- `activeBrandDna` → `CopyStudioPanel`, `AdBuilderPanel`, `VideoLabPanel`, `CampaignBatchPanel` (read-only prop).
- `onApplyBrandDna={setActiveBrandDna}` and `onInsertPhrase={(tool, text) => { setPendingInsert({ tool, text }); setActiveTool(tool); }}` → `BrandIdentityPanel`.
- `pendingInsert` (only when it matches the panel's own tool id) and `onInsertConsumed={() => setPendingInsert(null)}` → whichever of the 4 generation panels is currently mounted.

### 3. Badge — `src/components/sandbox/ActiveBrandDnaBadge.tsx` (new)

Small shared component, one prop (`brandDna: BrandDna`), renders "Active Brand Context: {brandName}" in the same pill style as the existing mock/status badges in this codebase (e.g. the `VideoLabPanel` mock-audio badge). Rendered by each of the 4 generation panels near their header, only when `activeBrandDna` is truthy. Extracted rather than duplicated 4x since the markup is identical everywhere it's used.

### 4. `BrandIdentityPanel.tsx` (extend)

- New props: `onApplyBrandDna: (dna: BrandDna) => void`, `onInsertPhrase: (tool: SandboxTool, text: string) => void`.
- Header gains an "Apply as Active Brand DNA" button, visible once `identity` is set, calling `onApplyBrandDna(toBrandDna(identity))`.
- Each Key Verbal Track card gains an "Insert" button next to the existing `CopyButton`, toggling a small dropdown (same hand-rolled blur-to-close pattern already built for the Export Swipe File menu) listing the 4 generation tools by label. Selecting one calls `onInsertPhrase(toolId, track)`.

### 5. The 4 generation panels (extend: `CopyStudioPanel.tsx`, `AdBuilderPanel.tsx`, `VideoLabPanel.tsx`, `CampaignBatchPanel.tsx`)

- New props: `activeBrandDna?: BrandDna | null`, `pendingInsert?: { tool: SandboxTool; text: string } | null`, `onInsertConsumed?: () => void`.
- `<ActiveBrandDnaBadge brandDna={activeBrandDna} />` rendered when `activeBrandDna` is set.
- The panel's `prompt` (or `campaignGoal` for `CampaignBatchPanel`) state's `useState` initializer becomes a lazy function: seeds from `pendingInsert.text` if `pendingInsert?.tool === <this panel's own tool id>`, else falls back to today's hardcoded default string. This works because switching `activeTool` already fully unmounts/remounts whichever panel isn't active (`{activeTool === 'copy' && <CopyStudioPanel />}` conditional rendering in `page.tsx`) — the same remount that already discards any in-progress edit on every tab switch today, so this introduces no new data-loss behavior.
- A `useEffect(() => { if (pendingInsert?.tool === <own tool id>) onInsertConsumed?.(); }, [])` (mount-only) clears the page-level pending state once consumed, so it doesn't reapply on a later unrelated re-render.
- Fetch bodies to `/api/sandbox/generate` (copy/ad/video, default+matrix modes only) and `/api/sandbox/campaign-batch` gain `activeBrandDna: activeBrandDna || undefined`.

### 6. Routes (extend: `src/app/api/sandbox/generate/route.ts`, `src/app/api/sandbox/campaign-batch/route.ts`)

- `generate/route.ts`: destructure `activeBrandDna` from the body in the default (single/matrix) branch only; pass it as the existing 6th argument: `callOpenAiJson(systemPrompt, userContext, mockFallback, 0.7, schema, activeBrandDna)`. `refine` and `dco` branches unchanged.
- `campaign-batch/route.ts`: destructure `activeBrandDna` from the body; pass it as the 6th argument to all 4 existing `callOpenAiJson` calls (matrix/ad/video/drip) — campaign batch is generated as one bundle, so all 4 outputs should reflect the same active brand context.

## Error handling

No new failure modes — `activeBrandDna`/`pendingInsert` are plain optional fields; `toBrandDna` never throws (every field access falls back to `undefined`); `formatBrandDnaBlock` already handles an all-empty `BrandDna` by returning `''` (no-op). Existing per-request error handling (`fetchGenerationJson` retry/backoff, `toast.error` on failure) is untouched.

## Testing

- `npx tsc --noEmit` — zero errors.
- Manual: mine a brand in Brand Identity tab, click "Apply as Active Brand DNA", confirm the badge appears in Copy Studio, Ad Builder, and Video Lab (and Campaign Engine) and a generation call in each reflects the brand voice/audience/value-prop framing. Click "Insert" on a Key Verbal Track targeting Copy Studio, confirm the tab switches and the brief field is pre-filled with that phrase.
