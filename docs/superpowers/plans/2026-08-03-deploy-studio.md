# Direct Platform Publishing & Export Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user select staged/promoted `CreativeAsset`s in `/sandbox`, pick a target platform (Meta Ads, Google Ads, TikTok), and either run a simulated "Deploy Campaign" (mock status progression to Active, persisted in metadata) or download a ZIP of platform-ready payload specs for the selection.

**Architecture:** A shared pure-function payload builder (`src/lib/platformExport.ts`) extracts per-type headline/body/creative-URL fields, used by a single `POST /api/sandbox/deploy` route that dispatches on an `action` field (`'deploy'` persists an `ACTIVE` deployment record into the asset's existing `metadata` JSON; `'export'` zips the built payloads and streams them back, no DB writes). `StagedAssetsList.tsx` gains multi-select checkboxes, a batch action toolbar, and per-platform "Ready" badges.

**Tech Stack:** Next.js App Router route handlers, Prisma, `jszip` (new dependency, in-memory zip generation), React/TypeScript, `tsx` for standalone script execution.

## Global Constraints

- No real ad-platform API integration anywhere — this is a mock launcher end to end. The Staged→Uploaded→Active progression is UI-only; only the terminal `ACTIVE` state persists server-side.
- No new DB table/column — deployment status lives in `CreativeAsset.metadata.deployments[platform]`, read-merge-written, same convention every prior sandbox feature in this app uses.
- Target URL resolution rule: `asset.organization?.customDomain || targetUrls?.[assetId]`. If neither exists for an asset, 400 before any writes happen for the whole batch (fail fast, no partial deploys).
- Batch operations (`assetIds: string[]`) must validate ALL requested IDs exist and ALL resolve a target URL before performing any side effect (DB write or zip build) — an all-or-nothing batch, not partial/best-effort.
- Platform badges and the multi-select checkbox appear on every asset card regardless of `STAGED`/`PRODUCTION` status (per the approved design's "All items" decision).

---

### Task 1: Platform payload builder

**Files:**
- Create: `src/lib/platformExport.ts`
- Create: `scripts/test-platform-export.ts`

**Interfaces:**
- Produces: `export type Platform = 'META' | 'GOOGLE' | 'TIKTOK'`
- Produces: `export type PlatformPayload = { assetId: string; platform: Platform; headline: string; body: string; creativeUrl: string | null; targetUrl: string }`
- Produces: `export function buildPlatformPayload(asset: { id: string; type: string; content: string; metadata: any }, platform: Platform, targetUrl: string): PlatformPayload`

- [ ] **Step 1: Create `src/lib/platformExport.ts`**

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

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return (match?.[0] || text).trim();
}

export function buildPlatformPayload(
  asset: { id: string; type: string; content: string; metadata: any },
  platform: Platform,
  targetUrl: string
): PlatformPayload {
  const metadata = asset.metadata || {};
  let headline: string;
  let body: string;
  let creativeUrl: string | null;

  if (asset.type === 'AD') {
    headline = metadata.headline || firstSentence(asset.content);
    body = asset.content;
    creativeUrl = metadata.imageUrl || null;
  } else if (asset.type === 'LANDING_PAGE') {
    headline = metadata.heroHeadline || firstSentence(asset.content);
    body = metadata.subheadline || asset.content;
    creativeUrl = null;
  } else if (asset.type === 'VIDEO_SCRIPT') {
    headline = metadata.beats?.[0]?.line || firstSentence(asset.content);
    body = asset.content;
    creativeUrl = metadata.beats?.[0]?.audioUrl || null;
  } else {
    headline = firstSentence(asset.content);
    body = asset.content;
    creativeUrl = null;
  }

  return { assetId: asset.id, platform, headline, body, creativeUrl, targetUrl };
}
```

- [ ] **Step 2: Write the failing test**

Create `scripts/test-platform-export.ts`:

```ts
import { buildPlatformPayload } from '../src/lib/platformExport';

type Case = {
  name: string;
  asset: { id: string; type: string; content: string; metadata: any };
  expected: { headline: string; body: string; creativeUrl: string | null };
};

const cases: Case[] = [
  {
    name: 'AD with headline + imageUrl',
    asset: { id: 'a1', type: 'AD', content: 'Book your free inspection today.', metadata: { headline: 'Free Roof Inspection', imageUrl: 'https://example.com/roof.jpg' } },
    expected: { headline: 'Free Roof Inspection', body: 'Book your free inspection today.', creativeUrl: 'https://example.com/roof.jpg' },
  },
  {
    name: 'AD missing headline falls back to first sentence',
    asset: { id: 'a2', type: 'AD', content: 'Call now for a quote. Limited slots.', metadata: {} },
    expected: { headline: 'Call now for a quote.', body: 'Call now for a quote. Limited slots.', creativeUrl: null },
  },
  {
    name: 'LANDING_PAGE uses heroHeadline + subheadline',
    asset: { id: 'a3', type: 'LANDING_PAGE', content: 'subheadline body', metadata: { heroHeadline: 'Your Roof, Done Right', subheadline: 'Same-day emergency repair' } },
    expected: { headline: 'Your Roof, Done Right', body: 'Same-day emergency repair', creativeUrl: null },
  },
  {
    name: 'VIDEO_SCRIPT uses first beat line + audioUrl',
    asset: { id: 'a4', type: 'VIDEO_SCRIPT', content: 'full script text', metadata: { beats: [{ line: 'Your roof, done right.', audioUrl: 'https://blob.example/a.mp3' }] } },
    expected: { headline: 'Your roof, done right.', body: 'full script text', creativeUrl: 'https://blob.example/a.mp3' },
  },
  {
    name: 'COPY (default) uses first sentence of content',
    asset: { id: 'a5', type: 'COPY', content: 'Emergency plumbing, 24/7. Call now.', metadata: {} },
    expected: { headline: 'Emergency plumbing, 24/7.', body: 'Emergency plumbing, 24/7. Call now.', creativeUrl: null },
  },
];

let failures = 0;
for (const { name, asset, expected } of cases) {
  const result = buildPlatformPayload(asset, 'META', 'https://client.example.com');
  const ok =
    result.headline === expected.headline &&
    result.body === expected.body &&
    result.creativeUrl === expected.creativeUrl &&
    result.assetId === asset.id &&
    result.platform === 'META' &&
    result.targetUrl === 'https://client.example.com';
  if (!ok) {
    failures++;
    console.error(`FAIL: ${name}`, { result, expected });
  }
}
if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('All platform export cases passed');
```

- [ ] **Step 3: Run it to verify it fails, then verify it passes**

Run: `npx tsx scripts/test-platform-export.ts`
Expected first run (before Step 1 exists): FAIL — import error, `buildPlatformPayload` doesn't exist. Since Steps 1 and 2 are written together above, comment out Step 1's file content temporarily (or delete the file), run the script to confirm it fails, then restore Step 1's code.

Run again: `npx tsx scripts/test-platform-export.ts`
Expected: `All platform export cases passed`

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/platformExport.ts scripts/test-platform-export.ts
git commit -m "feat: add platform payload builder for deploy studio"
```

---

### Task 2: Deploy/export API route

**Files:**
- Modify: `package.json` (add `jszip` dependency)
- Create: `src/app/api/sandbox/deploy/route.ts`

**Interfaces:**
- Consumes: `buildPlatformPayload`, `type Platform`, `type PlatformPayload` from `@/lib/platformExport` (Task 1).
- Produces: `POST /api/sandbox/deploy` — request `{ action: 'deploy' | 'export', assetIds: string[], platform: Platform, targetUrls?: Record<string, string> }`. `action: 'deploy'` success response `{ success: true, payloads: PlatformPayload[] }` (200); `action: 'export'` success response is a binary ZIP body with `Content-Type: application/zip` and a `Content-Disposition` download header (200). Error responses `{ error: string }`: 400 (bad `action`/`assetIds`/`platform`, or unresolvable target URL for one or more assets), 404 (one or more `assetIds` don't exist), 500 (unexpected failure). Task 3 (UI) consumes both response shapes.

- [ ] **Step 1: Install `jszip`**

Run: `npm install jszip`

- [ ] **Step 2: Write the route handler**

Create `src/app/api/sandbox/deploy/route.ts`:

```ts
import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { buildPlatformPayload, type Platform } from '@/lib/platformExport';

const VALID_PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, assetIds, platform, targetUrls } = body;

    if (action !== 'deploy' && action !== 'export') {
      return NextResponse.json({ error: "action must be 'deploy' or 'export'" }, { status: 400 });
    }
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ error: 'assetIds must be a non-empty array' }, { status: 400 });
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: `platform must be one of ${VALID_PLATFORMS.join(', ')}` }, { status: 400 });
    }

    const assets = await prisma.creativeAsset.findMany({
      where: { id: { in: assetIds } },
      include: { organization: { select: { customDomain: true } } },
    });

    const foundIds = new Set(assets.map((a) => a.id));
    const missingIds = assetIds.filter((id: string) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Asset(s) not found: ${missingIds.join(', ')}` }, { status: 404 });
    }

    const missingTargetUrl: string[] = [];
    const resolved = assets.map((asset) => {
      const targetUrl = asset.organization?.customDomain || targetUrls?.[asset.id];
      if (!targetUrl) missingTargetUrl.push(asset.id);
      return { asset, targetUrl };
    });
    if (missingTargetUrl.length > 0) {
      return NextResponse.json({ error: `Missing target URL for asset(s): ${missingTargetUrl.join(', ')}` }, { status: 400 });
    }

    const payloads = resolved.map(({ asset, targetUrl }) => buildPlatformPayload(asset, platform, targetUrl!));

    if (action === 'export') {
      const zip = new JSZip();
      payloads.forEach((p) => zip.file(`${p.assetId}-${platform}.json`, JSON.stringify(p, null, 2)));
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="platform-export.zip"',
        },
      });
    }

    const deployedAt = new Date().toISOString();
    await Promise.all(
      resolved.map(({ asset, targetUrl }) =>
        prisma.creativeAsset.update({
          where: { id: asset.id },
          data: {
            metadata: {
              ...((asset.metadata as object | null) || {}),
              deployments: {
                ...((asset.metadata as any)?.deployments || {}),
                [platform]: { status: 'ACTIVE', targetUrl, deployedAt },
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ success: true, payloads });
  } catch (err: any) {
    console.error('Sandbox deploy error:', err);
    return NextResponse.json({ error: err.message || 'Deploy failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify validation paths (no live DB rows needed)**

With the dev server running (`npm run dev`), run:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/deploy -H "Content-Type: application/json" -d "{}"
```

Expected: `{"error":"action must be 'deploy' or 'export'"}` with a 400 status.

```bash
curl -s -X POST http://localhost:3000/api/sandbox/deploy -H "Content-Type: application/json" -d "{\"action\":\"deploy\",\"assetIds\":[\"does-not-exist\"],\"platform\":\"META\"}"
```

Expected: `{"error":"Asset(s) not found: does-not-exist"}` with a 404 status — confirms routing, validation, and the Prisma lookup without needing a live database populated with real assets.

- [ ] **Step 4: Manual end-to-end verification (requires a real staged `CreativeAsset` id and a working database connection)**

Fetch a real asset id from `GET /api/sandbox/assets`, then:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/deploy -H "Content-Type: application/json" -d "{\"action\":\"deploy\",\"assetIds\":[\"<real-id>\"],\"platform\":\"META\",\"targetUrls\":{\"<real-id>\":\"https://example.com\"}}"
```

Expected: `{"success":true,"payloads":[{...}]}`. Re-fetch that asset via `GET /api/sandbox/assets` and confirm `metadata.deployments.META.status === 'ACTIVE'`. If this environment has no working database connection, this step returns a 500 with a connection error — expected, note it in the report rather than skipping the check.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/api/sandbox/deploy/route.ts
git commit -m "feat: add /api/sandbox/deploy route (deploy + export actions)"
```

---

### Task 3: Multi-select, batch toolbar, and deployment badges in `StagedAssetsList.tsx`

**Files:**
- Modify: `src/components/sandbox/StagedAssetsList.tsx`

**Interfaces:**
- Consumes: `POST /api/sandbox/deploy` (Task 2) for both `action: 'deploy'` (JSON response) and `action: 'export'` (binary ZIP response).

- [ ] **Step 1: Add imports and local state**

In `src/components/sandbox/StagedAssetsList.tsx`, update the icon import line:

```ts
import { Rocket, Loader2, Archive, Send, Download, FileArchive } from 'lucide-react';
```

Add a `Platform` type-only import (erased at build time, so importing from a server-side lib file is safe from a client component) and a platform constant near the top of the file (after the `TOOL_TYPE` const):

```ts
import type { Platform } from '@/lib/platformExport';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };
```

Inside the component, alongside the existing `useState` calls, add:

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [platform, setPlatform] = useState<Platform>('META');
const [manualTargetUrl, setManualTargetUrl] = useState('');
const [deploying, setDeploying] = useState(false);
const [exporting, setExporting] = useState(false);
```

- [ ] **Step 2: Add selection toggle and the batch deploy/export handlers**

Add these functions inside the component, near `promote`:

```ts
const toggleSelected = (assetId: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(assetId)) next.delete(assetId);
    else next.add(assetId);
    return next;
  });
};

const selectedAssets = assets.filter((a) => selectedIds.has(a.id));
const needsManualUrl = selectedAssets.some((a) => !a.organization);

const buildDeployBody = (action: 'deploy' | 'export') => {
  const targetUrls: Record<string, string> = {};
  if (manualTargetUrl.trim()) {
    for (const a of selectedAssets) {
      if (!a.organization) targetUrls[a.id] = manualTargetUrl.trim();
    }
  }
  return { action, assetIds: Array.from(selectedIds), platform, targetUrls };
};

const deploySelected = async () => {
  if (selectedIds.size === 0) return;
  setDeploying(true);
  try {
    const res = await fetch('/api/sandbox/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDeployBody('deploy')),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Deploy failed');
    toast.success(`Deployed ${data.payloads.length} asset(s) to ${PLATFORM_LABELS[platform]}`);
    load();
  } catch (err: any) {
    toast.error(err.message || 'Failed to deploy');
  } finally {
    setDeploying(false);
  }
};

const exportSelected = async () => {
  if (selectedIds.size === 0) return;
  setExporting(true);
  try {
    const res = await fetch('/api/sandbox/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDeployBody('export')),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'platform-export.zip';
    link.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    toast.error(err.message || 'Failed to export');
  } finally {
    setExporting(false);
  }
};
```

- [ ] **Step 3: Render the batch toolbar**

In the JSX, immediately before the `<div className="space-y-3">{assets.map(...` wrapper, insert:

```tsx
{selectedIds.size > 0 && (
  <div className="bg-slate-900/80 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center gap-3">
    <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
    <div className="flex gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
      {PLATFORMS.map((p) => (
        <button
          key={p}
          onClick={() => setPlatform(p)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            platform === p ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {PLATFORM_LABELS[p]}
        </button>
      ))}
    </div>
    {needsManualUrl && (
      <input
        value={manualTargetUrl}
        onChange={(e) => setManualTargetUrl(e.target.value)}
        placeholder="Target URL for unpromoted assets…"
        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500 min-w-[220px]"
      />
    )}
    <button
      onClick={deploySelected}
      disabled={deploying}
      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
    >
      {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      Deploy Campaign
    </button>
    <button
      onClick={exportSelected}
      disabled={exporting}
      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
      Export ZIP
    </button>
  </div>
)}
```

- [ ] **Step 4: Add the checkbox and deployment badges to each asset card**

In the per-asset card JSX, change the opening of the title row from:

```tsx
<div className="flex items-center gap-2">
  <span
    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
      asset.status === 'PRODUCTION'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    }`}
  >
    {asset.status}
  </span>
  <span className="text-sm font-bold text-white truncate">{asset.title}</span>
  {asset.organization && (
    <span className="text-[11px] text-slate-500">→ {asset.organization.name}</span>
  )}
</div>
```

to:

```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={selectedIds.has(asset.id)}
    onChange={() => toggleSelected(asset.id)}
    className="w-3.5 h-3.5 accent-indigo-500"
  />
  <span
    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
      asset.status === 'PRODUCTION'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    }`}
  >
    {asset.status}
  </span>
  <span className="text-sm font-bold text-white truncate">{asset.title}</span>
  {asset.organization && (
    <span className="text-[11px] text-slate-500">→ {asset.organization.name}</span>
  )}
  {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
    <span
      key={p}
      className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-300 border-violet-500/30"
    >
      {PLATFORM_LABELS[p]} Ready
    </span>
  ))}
</div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open `/sandbox` → Staged Assets view for any tool, check 2 asset checkboxes, confirm the batch toolbar appears with the selected count, pick a platform, click "Deploy Campaign" (or "Export ZIP" — confirm a `platform-export.zip` file downloads and contains one `.json` per selected asset when opened), confirm a "{Platform} Ready" badge appears next to a successfully deployed asset's title after the list reloads.

- [ ] **Step 7: Commit**

```bash
git add src/components/sandbox/StagedAssetsList.tsx
git commit -m "feat: add multi-select deploy/export toolbar and platform badges to Staged Assets"
```
