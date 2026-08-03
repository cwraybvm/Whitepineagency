# Direct Platform Publishing & Export Studio — Design

## Goal
Let a user select one or more staged/promoted `CreativeAsset`s in `/sandbox`, pick a target platform (Meta Ads, Google Ads, TikTok), and either run a simulated "Deploy Campaign" (mock status progression to Active, persisted) or download a ZIP of platform-ready payload specs for the selection.

## API

Single route: `POST /api/sandbox/deploy` (`src/app/api/sandbox/deploy/route.ts`), dispatching on a required `action` field — mirrors the existing `mode`-dispatch pattern already used in `src/app/api/sandbox/generate/route.ts`.

### Shared payload builder

New file `src/lib/platformExport.ts`:
```ts
export type Platform = 'META' | 'GOOGLE' | 'TIKTOK';

export type PlatformPayload = {
  assetId: string;
  platform: Platform;
  headline: string;
  body: string;
  creativeUrl: string | null;
  targetUrl: string;
};

export function buildPlatformPayload(asset: { id, type, title, content, metadata }, platform: Platform, targetUrl: string): PlatformPayload
```
Extracts `headline`/`body`/`creativeUrl` per asset `type`, mirroring the existing `hookTextFor` branching style in `src/lib/creativeScore.ts` (not duplicating that function — a parallel, export-specific extractor, since the fields needed here (`creativeUrl`) differ from scoring's needs):
- `AD`: `headline = metadata?.headline`, `body = content`, `creativeUrl = metadata?.imageUrl || null`
- `LANDING_PAGE`: `headline = metadata?.heroHeadline`, `body = metadata?.subheadline`, `creativeUrl = null`
- `VIDEO_SCRIPT`: `headline = metadata?.beats?.[0]?.line`, `body = content`, `creativeUrl = metadata?.beats?.[0]?.audioUrl || null`
- `COPY` / default: `headline = firstSentence(content)` (local copy of the same one-line regex already in `creativeScore.ts` — trivial, not worth importing across files for one line), `body = content`, `creativeUrl = null`

### `action: 'deploy'`

Request: `{ action: 'deploy', assetIds: string[], platform: Platform, targetUrls?: Record<string, string> }`

For each `assetId`: fetch the asset (with `organization` included), compute `targetUrl = asset.organization?.customDomain || targetUrls?.[assetId]`; if neither exists, collect it into a 400 error (`{ error: 'Missing target URL for asset(s): <ids>' }`) — checked for *all* selected assets before any writes happen, so a partial batch never partially deploys. Then for each asset: build its `PlatformPayload`, and persist via `prisma.creativeAsset.update`: read-merge-write the asset's existing `metadata` object with `metadata.deployments[platform] = { status: 'ACTIVE', targetUrl, deployedAt: new Date().toISOString() }` (no schema change — same pattern as every other sandbox feature in this app). Returns `{ success: true, payloads: PlatformPayload[] }`.

The Staged → Uploaded → Active progression named in the task is UI-only: the panel shows a brief "Uploading…" transitional state client-side before the single API call resolves. Only the terminal `ACTIVE` state is persisted — this is a mock launcher with no real ad-platform integration, and pretending to track an intermediate server-side state would be dishonest scaffolding.

### `action: 'export'`

Request: `{ action: 'export', assetIds: string[], platform: Platform, targetUrls?: Record<string, string> }`

Same fetch + `targetUrl` resolution + 400-on-missing as deploy, but no DB writes. Builds one `PlatformPayload` per asset, zips them (`jszip` — new dependency, in-memory `generateAsync`, no native build step, fits a single-shot serverless route better than a streaming archiver) as `<asset-id>-<platform>.json` per entry, and returns `new NextResponse(zipBuffer, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="platform-export.zip"' } })`.

## UI — `StagedAssetsList.tsx`

- Every asset card (regardless of `STAGED`/`PRODUCTION` status) gets a checkbox, backed by a `Set<string>` of selected IDs in local state.
- A batch toolbar appears once 1+ assets are selected: a platform picker (Meta / Google / TikTok, three buttons matching the existing tab-button style elsewhere in this app), a manual "Target URL" text input shown only when the current selection includes at least one asset with no `organization` attached, and two buttons — "Deploy Campaign" and "Export ZIP" — sharing that platform + target-URL state.
- Platform badges: for each `platform` key present in `asset.metadata?.deployments` with `status === 'ACTIVE'`, render a small badge reading `"{Platform} Ready"` (e.g. "Meta Ready") next to the asset's title, independent of selection/status — this is what makes a deployment durable/visible across reloads, not just a transient toast.

## Error handling

Same conventions as every existing sandbox route: 400 for missing/invalid input or unresolvable target URLs, 500 with `err.message` fallback for unexpected failures (e.g. a bad `assetId` that doesn't resolve — treated as 404 for that specific ID, collected the same way missing-target-URL errors are, before any writes happen).

## Testing

No test framework in this repo (same precedent as the prior two branches). The runnable check is a standalone script exercising `buildPlatformPayload`'s type-branching logic across all four asset types plus the target-URL resolution rule, in the same plain-assert style as `scripts/test-generate-voice-validation.ts` and `scripts/test-landing-page-validation.ts`.

## Out of scope
- Any real Meta/Google/TikTok API integration or OAuth — this is a mock launcher end to end.
- Undeploying / rolling back a deployment badge once set to `ACTIVE`.
- Editing `targetUrls` after a deploy without re-running the action.
