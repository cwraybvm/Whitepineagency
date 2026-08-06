# Multi-Asset ZIP Exporter — Design

## Context

Fifth and final sub-project of the "Creative Sandbox UX & Robustness Enhancements" roadmap.
Bundles a full generated package — every audience variant for Direct Mail, the full post for Blog
— into a downloadable `.zip` for client delivery.

## Direct Mail (`DirectMailPanel.tsx`)

No new API route, no offscreen render rig. Reuses the exact `captureCanvas` / `jsPDF` code already
in `downloadPng` / `downloadPdf`, sequentially, by temporarily driving the *existing*
`activeVariantIndex` state through every variant — same refs, same rendered mockup, no parallel DOM
tree. A double `requestAnimationFrame` after each index switch waits for the re-render to paint
before capturing that variant. The original `activeVariantIndex` is restored in `finally`, even on
error. The user sees a brief flash through each variant tab during export — acceptable for an
infrequent action, and it doubles as progress feedback.

Per variant, a folder named after the slugified audience name:
- Postcard form factor: `front.png`, `back.png`, `postcard.pdf`, `metadata.json` (the variant
  object, `JSON.stringify(variant, null, 2)`)
- Letter form factor: `letter.png`, `letter.pdf`, `metadata.json`

Plus one top-level `campaign.json` — the full `DirectMailPackage`.

PNGs come from `canvas.toBlob()` wrapped in a promise (not manual base64 splitting) so every asset
handed to `zip.file()` is a `Blob`, matching what `jsPDF#output('blob')` already returns — one
consistent shape.

UI: one "Export Campaign Pack (.zip)" button in the existing PNG/PDF/JSON export row, guarded by
`pkg !== null`. `exporting`'s type extends from `'png' | 'pdf' | 'json' | null` to include `'zip'`,
so it disables alongside the other three export buttons during the loop (same existing
`disabled={exporting !== null}` guard, no new disabling logic).

## Blog Studio (`BlogPostStudioPanel.tsx`)

No DOM capture needed — every piece is already a computed string: `previewHtml`,
`pkg.contentMarkdown`, `JSON.stringify(pkg, null, 2)`. Purely client-side `jszip`, no state
switching, no loop:
- `<slug>.html`, `<slug>.md`, `<slug>.json`

UI: one "Export Full Package (.zip)" button next to the existing Copy HTML / Download HTML /
Markdown / JSON row, guarded by `pkg !== null`.

## Scope decision: client-side, no server route

Both ZIPs are built entirely in the browser with `jszip` (already a dependency, already
dynamic-imported on click in this file for `html2canvas-pro` and `jspdf` — same pattern extends
here). This is a deliberate deviation from `CampaignBatchPanel`'s `/api/sandbox/export-pack` route:
that route exists specifically because *that* export fetches remote voiceover audio with a timeout
— genuine server-side work. Neither Direct Mail's PNG/PDF capture (browser-only, `html2canvas`
cannot run server-side) nor Blog's already-in-memory strings need a server round-trip; adding one
would only add latency.

## Out of scope / skipped

- A server route for either export.
- Any new dependency — `jszip`, `jspdf`, `html2canvas-pro` are all already installed.
- Bundling anything beyond what's already generated in-panel (no fetching additional assets, no
  new AI calls).

## Testing

`npx tsc --noEmit` clean, `npm run build` clean. Live browser check: generate a Direct Mail
postcard package with 3 audiences, click "Export Campaign Pack (.zip)", confirm the variant tabs
visibly flash through during export, the final active tab matches what was selected before export
started, and the unzipped file has 3 folders each with `front.png`/`back.png`/`postcard.pdf`/
`metadata.json` plus a top-level `campaign.json`. Repeat for the letter form factor. Generate a
Blog Studio post, click "Export Full Package (.zip)", confirm the unzipped file has the `.html`,
`.md`, and `.json` files with correct content.
