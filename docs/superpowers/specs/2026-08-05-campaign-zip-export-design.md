# Campaign ZIP Export Endpoint — Design

## Context

This is the third and final sub-project under the "Sandbox Robustness & Resilience Pass" (the
first two — generation retry/backoff, and generation history/local persistence — are already
shipped; see the sibling specs dated 2026-08-04 and 2026-08-05 in this directory). This spec covers
a new `/api/sandbox/export-pack` endpoint that packages a generated campaign into a downloadable
`.zip`, plus the UI button that triggers it.

## Scope Decisions

**The export button lives on the Campaign Batch Engine panel, not a page-level bar.**
`CampaignBatchPanel.tsx` is the only Creative Sandbox panel that already assembles a full
multi-asset "campaign" in one shot — its `batch` state holds 5 copy angles, one ad, one video
script (with beats), and a drip sequence, generated together from `/api/sandbox/campaign-batch`.
The zip's contents (copy variations, storyboard, ad metadata) map directly onto that shape. A
page-level export bar reaching into whichever tab happens to be active would require lifting state
out of Copy Studio, Ad Builder, and Video Lab — each of which currently owns its state
independently — for no clear benefit over exporting the one panel that already bundles everything.

**Voiceover audio is included only when a beat already has an `audioUrl`.** Real voiceover clips
are produced by `VideoLabPanel`'s per-beat "Generate Scene Audio" button
(`POST /api/sandbox/generate-voice`), which `CampaignBatchPanel` does not call — its generated
beats never carry an `audioUrl`. Rather than adding new voice-generation scope to Campaign Batch,
the export endpoint accepts an optional `audioUrl` per beat and simply omits the
`voiceover-audio/` folder when none of the beats have one. This keeps the endpoint's contract
generic (a beat with real Video Lab-sourced audio would still work) without inventing a feature
nobody asked for.

**Drip sequence content is excluded from the pack.** The requirements list copy variations,
storyboard, voiceover, and ad — not the 3-step follow-up drip that `CampaignBatchPanel` also
generates. Only what's asked for goes in the zip.

**The CSV is a manual-paste-friendly sheet, not a certified platform bulk-upload template.** No
Meta/Google Ads Manager bulk-upload format exists anywhere else in this repo to conform to, and
building one from scratch is out of scope. `copy-variations.csv` uses generic
`Angle, Headline, Primary Text` columns instead.

**No binary ad image is packaged.** `CampaignBatchPanel`'s `ad` object carries only
`{ title, content, metadata: { headline, cta } }` — no image URL (only `AdBuilderPanel` collects
one, and that panel is out of scope here per the first scope decision above). Ad content is folded
into `README.txt` as text instead of a separate file.

## Architecture

### Request — `POST /api/sandbox/export-pack`

```ts
type ExportPackRequest = {
  organizationId?: string;
  organizationName?: string;
  campaignGoal?: string;
  targetAudience?: string;
  copyVariations: { angle: string; title: string; content: string }[];
  ad?: { title: string; content: string; metadata: { headline: string; cta: string } };
  video?: { title: string; content: string; beats: Beat[] }; // Beat type from src/components/sandbox/types.ts
};
```

`CampaignBatchPanel` sends this from its existing `batch` state: `copyVariations: batch.angles`,
`ad: batch.ad`, `video: batch.video`, plus `organizationId`/`organizationName` (from its `orgs`
lookup), `campaignGoal`, and `targetAudience` (both already panel state). `copyVariations` is the
only required field — `ad` and `video` are optional so the endpoint degrades gracefully if a future
caller has a partial campaign.

### Response

On success: `200` with the zip binary, headers:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="campaign-pack-<ISO-timestamp-with-colons-stripped>.zip"
```

On failure (malformed body, zip generation error): `NextResponse.json({ error }, { status })` — 400
for a missing/empty `copyVariations`, 500 for unexpected failures. Per-beat audio fetch failures do
**not** fail the request — see Error Handling below.

### Zip contents

```
campaign-pack-<timestamp>.zip
├── README.txt
├── copy-variations.json
├── copy-variations.csv
├── storyboard-summary.md        (only if `video` present)
└── voiceover-audio/
    ├── scene-1.mp3              (only for beats with a fetchable audioUrl)
    └── scene-3.mp3
```

**`copy-variations.json`** — `JSON.stringify(copyVariations, null, 2)`, verbatim.

**`copy-variations.csv`** — header row `Angle,Headline,Primary Text`, one row per variation,
fields CSV-escaped (wrapped in `"..."` with internal `"` doubled — the same minimal escaping
approach, no new dependency needed for 3 flat string columns).

**`storyboard-summary.md`** (only when `video` is present):
```md
# <video.title>

**Scene 1 — <beat.scene>**
Visual: <beat.shot>
VO: <beat.line>

**Scene 2 — ...**
...
```
Beats without a `line`/`shot` still render their scene header — no field is assumed present beyond
what `Beat` already types as required (`scene`, `shot`, `line`).

**`voiceover-audio/scene-N.mp3`** — for each beat (1-indexed) with a truthy `audioUrl`:
- If `audioUrl` is a `data:` URI (the mock silent-WAV case from `sandboxPrompts.ts`), decode its
  base64 payload directly — no network call, can't time out. Written as `scene-N.wav` in that case
  (extension follows the actual encoded format) — real clips are `.mp3` (from
  `/api/sandbox/generate-voice`'s Vercel Blob upload), mocks are `.wav`.
- Otherwise, `fetch(audioUrl)` with a 5-second timeout (`AbortSignal.timeout(5000)`). On success,
  the response bytes are added as `scene-N.mp3`. On timeout, network error, or non-2xx response,
  the file is skipped and a line is appended to a `readmeNotes` array: `` `Scene N voiceover
  unavailable — audioUrl fetch failed, see manifest link: <audioUrl>` ``.

**`README.txt`**:
```
CAMPAIGN EXPORT PACK
Generated: <ISO timestamp>
Organization: <organizationName || 'No client selected'>
Campaign Goal: <campaignGoal || '(not set)'>
Target Audience: <targetAudience || '(not set)'>

AD CREATIVE
Title: <ad.title>
Headline: <ad.metadata.headline>
CTA: <ad.metadata.cta>
Body: <ad.content>
(section omitted entirely if `ad` was not provided)

NOTES
<any readmeNotes lines from failed audio fetches>
(section omitted entirely if there are no notes)
```

## UI

### `CampaignBatchPanel.tsx` changes

A new `exporting` boolean state, and an "Export Pack (.zip)" button placed next to the existing
"Batch Stage Campaign" button — same row, both guarded by `batch !== null` (the export button
simply doesn't render when there's no batch yet, matching how the stage button's container is
already conditional on `{batch && (...)}`).

Click handler (`exportPack`), modeled directly on `StagedAssetsList.exportSelected` — the repo's
existing zip-download pattern — since the response here is also a binary blob, not JSON, so it uses
a plain `fetch` + manual `.ok` check rather than `fetchGenerationJson`:

```ts
const exportPack = async () => {
  if (!batch) return;
  setExporting(true);
  try {
    const res = await fetch('/api/sandbox/export-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: organizationId || undefined,
        organizationName: selectedOrg?.name,
        campaignGoal,
        targetAudience,
        copyVariations: batch.angles,
        ad: batch.ad,
        video: batch.video,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-pack.zip';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Campaign pack downloaded');
  } catch (err: any) {
    toast.error(err.message || 'Failed to export campaign pack');
  } finally {
    setExporting(false);
  }
};
```

Button shows a spinning `Loader2` in place of its icon while `exporting` is true, same visual
pattern as every other async button in this panel (`generating`/`staging`).

## Error Handling

- **Missing/empty `copyVariations` in the request body** → `400` before any zip work starts.
- **Per-beat audio fetch timeout or failure** → does not fail the export; that beat's clip is
  skipped and a note is appended to `README.txt` (the "textual manifest fallback" required by the
  spec). This is the only place remote binary fetching happens, since Campaign Batch has no ad
  image URL to fetch.
- **Zip generation failure (`JSZip#generateAsync` throwing)** → caught by the route's top-level
  `try/catch`, returns `500` with `{ error }`. Mirrors the existing `deploy` route's error handling.
- **Client-side fetch/network failure** → caught in `exportPack`'s `catch`, surfaced via
  `toast.error`, `exporting` reset in `finally` — same shape as every other panel action in this
  codebase.

## Out of Scope

- Export triggers on Copy Studio, Ad Builder, or Video Lab individually (see Scope Decisions).
- A certified Meta/Google Ads Manager bulk-upload CSV format.
- Packaging a binary ad image (Campaign Batch's `ad` has no image URL).
- Auto-generating voiceover audio at export time for beats that don't already have it.
- Including the drip/follow-up sequence content in the pack.

## Testing

`npx tsc --noEmit` clean, zero errors.

Live browser verification:
1. Generate a full campaign in Campaign Batch Engine, click "Export Pack (.zip)". Confirm a
   `.zip` downloads, the button shows a spinner during compilation, and a success toast fires.
2. Unzip and confirm: `README.txt` has the right goal/audience/org/timestamp;
   `copy-variations.json` matches the 5 generated angles; `copy-variations.csv` opens cleanly with
   the 3 expected columns; `storyboard-summary.md` lists every beat.
3. Confirm `voiceover-audio/` is absent (Campaign Batch beats have no `audioUrl` today) and no
   `README.txt` note about failed fetches appears in that case (nothing was attempted).
4. Force a server error (e.g. temporarily break the request body) and confirm the button shows an
   error toast rather than hanging or crashing the panel.
