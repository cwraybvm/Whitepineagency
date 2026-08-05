# Brand Identity Dashboard, API Route & Swipe File Exporter Design

**Goal:** Surface `extractBrandFromUrl` (built in the prior brand-extraction-engine step) in the Creative Sandbox as a new "Brand Identity" tab — mine a client URL, browse the result (palette, images, mined copy, ad strategy), and export it as a Markdown or JSON swipe file.

**Non-goals:** No Organization DB writes — the 8 mined fields (brand name, images, verbal tracks, ad angles, etc.) don't map to any existing `Organization` column and this is a read-only report, not the brand-DNA persistence flow `BrandDnaDrawer` already owns. No cross-panel state plumbing — "copy" and "inject into sandbox" are the same clipboard action (confirmed), so there's one button, not two. No new npm dependencies.

## Architecture

### 1. API route — `src/app/api/sandbox/brand-identity/route.ts` (new)

Mirrors `src/app/api/sandbox/extract-brand/route.ts`'s structure:

```ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateExtractBrandUrl(body?.url);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    try {
      const identity = await extractBrandFromUrl(body.url);
      return NextResponse.json({ success: true, ...identity });
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'Timed out fetching the URL' : err.message || 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err: any) {
    console.error('Sandbox brand-identity error:', err);
    return NextResponse.json({ error: err.message || 'Brand identity extraction failed' }, { status: 500 });
  }
}
```

Validation runs in the route (not just inside `extractBrandFromUrl`) so a bad URL reliably 400s before any fetch attempt, same as `extract-brand`.

### 2. Swipe file builder — `src/lib/swipeFileExport.ts` (new)

One pure function, following the existing `exportPack.ts` builder-function convention:

```ts
export function buildSwipeFileMarkdown(identity: ExtractedBrandIdentity, sourceUrl: string): string
```

Produces a formatted report: brand name + source URL header, Brand Voice, Color Palette (hex list), Asset Links (image URLs), Key Verbal Tracks (bulleted quotes), Active Ad Angles, Core Value Props, Target Audience Profile. No function needed for the JSON export — `JSON.stringify(identity, null, 2)` inline at the call site.

### 3. UI component — `src/components/sandbox/BrandIdentityPanel.tsx` (new)

Same left-controls / right-results grid layout as `SwipeAnalyzerPanel.tsx`:

- **Left panel:** URL input + "Mine Brand DNA" button, `Loader2` spinner while `mining` is true, error state via `toast.error` on failure (matching every other panel's fetch-error handling).
- **Right panel, once `identity` is set:**
  - Header: `identity.brandName` + `identity.brandVoice` as a small badge.
  - **Palette:** row of swatches (`identity.colors`), click → `navigator.clipboard.writeText(hex)` + `toast.success`, same interaction as `BrandDnaDrawer`'s existing swatch-click pattern but copies instead of selecting.
  - **Visuals:** thumbnail grid (`identity.brandImages`), each an `<img>` in a bordered square, click opens the original URL in a new tab (`window.open`).
  - **Key Verbal Tracks:** list of quote cards, each rendering the existing `CopyButton` component unmodified (reused, not reimplemented) — single "Copy" affordance per the inject-equals-copy decision.
  - **Ad Strategy Breakdown:** 3-card grid (Active Ad Angles / Core Value Props / Target Audience Profile), visually matching `SwipeAnalyzerPanel`'s existing insight-card grid (label + value, no new card component needed).
  - **Empty state:** before first mine, static prompt text matching the tone of `SwipeAnalyzerPanel`'s own empty state.
- **Export:** "Export Swipe File" button toggles a small hand-rolled menu (local `useState` open/close, click-outside-to-close) — no Radix, matching every other menu/dropdown in this codebase, all of which are hand-rolled. Two items:
  - "Download Markdown (.md)" → `buildSwipeFileMarkdown(identity, url)` → `Blob` → `URL.createObjectURL` → `<a download>` click → `URL.revokeObjectURL`, identical mechanics to `VideoLabPanel.downloadShotPrompts`.
  - "Download JSON (.json)" → `JSON.stringify(identity, null, 2)` → same Blob/download mechanics.

Both exports are pure client-side; the mined `identity` is already in component state, no additional network round-trip.

### 4. Wiring — `src/app/(sandbox)/sandbox/page.tsx` + `src/components/sandbox/types.ts`

- `SandboxTool` gains `'brand-identity'`.
- `TABS` array gains `{ id: 'brand-identity', label: 'Brand Identity', icon: <suitable lucide icon, e.g. Fingerprint> }`.
- Render block gains `{activeTool === 'brand-identity' && <BrandIdentityPanel />}`.
- `ExtractedBrandIdentity` type is consumed via `import type { ExtractedBrandIdentity } from '@/lib/sandboxPrompts'` directly in the client component — type-only import, erased at compile, no server-SDK code reaches the client bundle.

## Error handling

Route: 400 for invalid URL (matches `extract-brand`), 502 for fetch/timeout failures from `extractBrandFromUrl`, 500 for anything unexpected (malformed body). Component: any non-OK response surfaces via `toast.error(data.error || 'Brand identity extraction failed')`, mining state resets in a `finally` block, same as every other panel's async-action pattern in this codebase.

## Testing

- `npx tsc --noEmit` — zero errors.
- Manual: with dev server running and no LLM provider key set, mine a real URL from the new tab, confirm all sections render with `[MOCK]`-prefixed content, palette swatches copy on click, verbal-track Copy buttons work, both export downloads produce a correctly-named file with the expected content.
