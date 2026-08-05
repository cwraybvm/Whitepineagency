# Campaign ZIP Export Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /api/sandbox/export-pack` endpoint that packages a generated Campaign Batch (copy angles, ad metadata, video storyboard, optional voiceover clips) into a downloadable `.zip`, and wire an "Export Pack (.zip)" button into `CampaignBatchPanel.tsx` to trigger it.

**Architecture:** Pure, testable builder functions (`src/lib/exportPack.ts`) produce the CSV/Markdown/README text content. The route handler (`src/app/api/sandbox/export-pack/route.ts`) validates the request, fetches/decodes any per-beat voiceover audio, assembles everything with `JSZip`, and streams back the binary with `Content-Type: application/zip`. The panel's click handler mirrors the existing `StagedAssetsList.exportSelected` blob-download pattern already in this codebase.

**Tech Stack:** Next.js Route Handlers, `JSZip` (already a dependency), TypeScript, `lucide-react` (`FileArchive` icon), `sonner` toasts — no new dependencies.

## Global Constraints

- `copyVariations` is the only required field in the request body; `ad` and `video` are optional.
- `video`'s shape matches `CampaignBatch['video']` from `src/components/sandbox/types.ts`: `{ title: string; content: string; metadata: { beats: Beat[] } }` — beats live at `video.metadata.beats`, not `video.beats`.
- `voiceover-audio/` is only added to the zip if at least one beat has a truthy `audioUrl` that successfully decodes/fetches — never an empty folder.
- Per-beat audio fetch failures/timeouts must not fail the whole request — they degrade to a `README.txt` note.
- Response headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="campaign-pack-<timestamp>.zip"`.
- No new npm dependencies.
- `npx tsc --noEmit` must be clean (zero errors) when this work is done.

---

## Task 1: Pure Builder Functions (`src/lib/exportPack.ts`)

**Files:**
- Create: `src/lib/exportPack.ts`
- Verification (temporary, deleted after use): `scratch-test-export-pack.ts` (repo root)

**Interfaces:**
- Consumes: `Beat` type from `src/components/sandbox/types.ts`.
- Produces: `buildCopyVariationsCsv(variations: { angle: string; title: string; content: string }[]): string`, `buildStoryboardMarkdown(video: { title: string; metadata: { beats: Beat[] } }): string`, `buildReadme(opts: ReadmeOptions): string` where `ReadmeOptions = { organizationName?: string; campaignGoal?: string; targetAudience?: string; ad?: { title: string; content: string; metadata: { headline: string; cta: string } }; notes: string[]; generatedAt: string }`.

- [ ] **Step 1: Write `src/lib/exportPack.ts`**

```ts
import type { Beat } from '@/components/sandbox/types';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCopyVariationsCsv(variations: { angle: string; title: string; content: string }[]): string {
  const rows = [
    ['Angle', 'Headline', 'Primary Text'],
    ...variations.map((v) => [v.angle, v.title, v.content]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function buildStoryboardMarkdown(video: { title: string; metadata: { beats: Beat[] } }): string {
  const lines = [`# ${video.title}`, ''];
  (video.metadata.beats || []).forEach((beat, i) => {
    lines.push(`**Scene ${i + 1} — ${beat.scene}**`);
    lines.push(`Visual: ${beat.shot}`);
    lines.push(`VO: ${beat.line}`);
    lines.push('');
  });
  return lines.join('\n');
}

export type ReadmeOptions = {
  organizationName?: string;
  campaignGoal?: string;
  targetAudience?: string;
  ad?: { title: string; content: string; metadata: { headline: string; cta: string } };
  notes: string[];
  generatedAt: string;
};

export function buildReadme(opts: ReadmeOptions): string {
  const lines = [
    'CAMPAIGN EXPORT PACK',
    `Generated: ${opts.generatedAt}`,
    `Organization: ${opts.organizationName || 'No client selected'}`,
    `Campaign Goal: ${opts.campaignGoal || '(not set)'}`,
    `Target Audience: ${opts.targetAudience || '(not set)'}`,
  ];
  if (opts.ad) {
    lines.push(
      '',
      'AD CREATIVE',
      `Title: ${opts.ad.title}`,
      `Headline: ${opts.ad.metadata.headline}`,
      `CTA: ${opts.ad.metadata.cta}`,
      `Body: ${opts.ad.content}`
    );
  }
  if (opts.notes.length > 0) {
    lines.push('', 'NOTES', ...opts.notes);
  }
  return lines.join('\n');
}
```

- [ ] **Step 2: Write a standalone verification script at repo root**

```ts
// scratch-test-export-pack.ts
import { buildCopyVariationsCsv, buildStoryboardMarkdown, buildReadme } from './src/lib/exportPack';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('PASS:', msg);
  }
}

// 1. CSV escapes embedded quotes and commas correctly.
const csv = buildCopyVariationsCsv([
  { angle: 'Fear/Urgency', title: 'Don\'t wait, "act now"', content: 'Limited slots, call today, save 20%' },
]);
const expectedRow = '"Fear/Urgency","Don\'t wait, ""act now""","Limited slots, call today, save 20%"';
assert(csv.split('\r\n')[0] === '"Angle","Headline","Primary Text"', 'CSV header row is correct');
assert(csv.split('\r\n')[1] === expectedRow, 'CSV row escapes embedded quotes/commas correctly');

// 2. Storyboard markdown renders one block per beat, 1-indexed.
const md = buildStoryboardMarkdown({
  title: 'Emergency Plumbing Ad',
  metadata: {
    beats: [
      { scene: 'Open on leaking pipe', shot: 'Close-up, dim lighting', line: 'Water everywhere?' },
      { scene: 'Technician arrives', shot: 'Wide shot, daylight', line: 'We fix it fast.' },
    ],
  },
});
assert(md.startsWith('# Emergency Plumbing Ad'), 'Markdown starts with the video title as an H1');
assert(md.includes('**Scene 1 — Open on leaking pipe**'), 'First beat is Scene 1');
assert(md.includes('**Scene 2 — Technician arrives**'), 'Second beat is Scene 2');
assert(md.includes('VO: We fix it fast.'), 'Beat voiceover line is included');

// 3. README omits the AD CREATIVE section when no ad is given, includes it when present.
const readmeNoAd = buildReadme({ notes: [], generatedAt: '2026-08-05T00:00:00.000Z' });
assert(!readmeNoAd.includes('AD CREATIVE'), 'README omits AD CREATIVE section when ad is absent');
assert(readmeNoAd.includes('Organization: No client selected'), 'README defaults org name when absent');

const readmeWithAd = buildReadme({
  ad: { title: 'Roof Special', content: 'Get 20% off', metadata: { headline: 'Save Today', cta: 'Call Now' } },
  notes: ['Scene 1 voiceover unavailable — audioUrl fetch failed, see manifest link: https://example.com/a.mp3'],
  generatedAt: '2026-08-05T00:00:00.000Z',
});
assert(readmeWithAd.includes('AD CREATIVE'), 'README includes AD CREATIVE section when ad is present');
assert(readmeWithAd.includes('Headline: Save Today'), 'README includes ad headline');
assert(readmeWithAd.includes('NOTES'), 'README includes NOTES section when notes are non-empty');
assert(readmeWithAd.includes('Scene 1 voiceover unavailable'), 'README includes the fetch-failure note text');

if (process.exitCode === 1) {
  console.error('One or more checks failed.');
} else {
  console.log('All exportPack builder checks passed.');
}
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scratch-test-export-pack.ts`
Expected: every line prints `PASS:` and the final line is `All exportPack builder checks passed.` with exit code 0.

- [ ] **Step 4: Delete the verification script**

```bash
rm scratch-test-export-pack.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportPack.ts
git commit -m "feat: add exportPack builder functions for campaign ZIP export"
```

---

## Task 2: Route Handler (`src/app/api/sandbox/export-pack/route.ts`)

**Files:**
- Create: `src/app/api/sandbox/export-pack/route.ts`

**Interfaces:**
- Consumes: `buildCopyVariationsCsv`, `buildStoryboardMarkdown`, `buildReadme` from `src/lib/exportPack.ts` (Task 1); `Beat` type from `src/components/sandbox/types.ts`.
- Produces: `POST` handler at `/api/sandbox/export-pack` returning a `.zip` binary or a JSON error.

- [ ] **Step 1: Write `src/app/api/sandbox/export-pack/route.ts`**

```ts
import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import type { Beat } from '@/components/sandbox/types';
import { buildCopyVariationsCsv, buildStoryboardMarkdown, buildReadme } from '@/lib/exportPack';

type ExportPackRequest = {
  organizationId?: string;
  organizationName?: string;
  campaignGoal?: string;
  targetAudience?: string;
  copyVariations: { angle: string; title: string; content: string }[];
  ad?: { title: string; content: string; metadata: { headline: string; cta: string } };
  video?: { title: string; content: string; metadata: { beats: Beat[] } };
};

async function fetchAudioBuffer(audioUrl: string): Promise<Buffer | null> {
  if (audioUrl.startsWith('data:')) {
    const base64 = audioUrl.split(',')[1] || '';
    return base64 ? Buffer.from(base64, 'base64') : null;
  }
  try {
    const res = await fetch(audioUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const { organizationName, campaignGoal, targetAudience, copyVariations, ad, video } = body as ExportPackRequest;

    if (!Array.isArray(copyVariations) || copyVariations.length === 0) {
      return NextResponse.json({ error: 'copyVariations must be a non-empty array' }, { status: 400 });
    }

    const zip = new JSZip();
    const notes: string[] = [];

    zip.file('copy-variations.json', JSON.stringify(copyVariations, null, 2));
    zip.file('copy-variations.csv', buildCopyVariationsCsv(copyVariations));

    if (video) {
      zip.file('storyboard-summary.md', buildStoryboardMarkdown(video));

      const beats = video.metadata?.beats || [];
      let audioFolder: JSZip | null = null;
      for (let i = 0; i < beats.length; i++) {
        const audioUrl = beats[i].audioUrl;
        if (!audioUrl) continue;
        const buffer = await fetchAudioBuffer(audioUrl);
        if (buffer) {
          if (!audioFolder) audioFolder = zip.folder('voiceover-audio')!;
          const ext = audioUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
          audioFolder.file(`scene-${i + 1}.${ext}`, buffer);
        } else {
          notes.push(`Scene ${i + 1} voiceover unavailable — audioUrl fetch failed, see manifest link: ${audioUrl}`);
        }
      }
    }

    zip.file(
      'README.txt',
      buildReadme({ organizationName, campaignGoal, targetAudience, ad, notes, generatedAt: new Date().toISOString() })
    );

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="campaign-pack-${timestamp}.zip"`,
      },
    });
  } catch (err: any) {
    console.error('Sandbox export-pack error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sandbox/export-pack/route.ts
git commit -m "feat: add /api/sandbox/export-pack ZIP export endpoint"
```

---

## Task 3: Wire Up Campaign Batch Engine Panel

**Files:**
- Modify: `src/components/sandbox/CampaignBatchPanel.tsx`

**Interfaces:**
- Consumes: `POST /api/sandbox/export-pack` (Task 2).

- [ ] **Step 1: Add the icon import**

Change (line 5):
```ts
import { Wand2, Loader2, Rocket, Clapperboard, MessageSquareText, RefreshCw } from 'lucide-react';
```
to:
```ts
import { Wand2, Loader2, Rocket, Clapperboard, MessageSquareText, RefreshCw, FileArchive } from 'lucide-react';
```

- [ ] **Step 2: Add `exporting` state**

Change (line 21-22):
```ts
  const [staging, setStaging] = useState(false);
  const [batch, setBatch] = useState<CampaignBatch | null>(null);
```
to:
```ts
  const [staging, setStaging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [batch, setBatch] = useState<CampaignBatch | null>(null);
```

- [ ] **Step 3: Add the `exportPack` handler**

After the `stage` function's closing brace (after line 102, before the `return (` on line 104), add:

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

- [ ] **Step 4: Add the button next to "Batch Stage Campaign"**

Change (lines 254-261):
```tsx
          <button
            onClick={stage}
            disabled={staging}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            {staging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {staging ? 'Staging campaign…' : 'Batch Stage Campaign'}
          </button>
```
to:
```tsx
          <div className="flex gap-2">
            <button
              onClick={stage}
              disabled={staging}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {staging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {staging ? 'Staging campaign…' : 'Batch Stage Campaign'}
            </button>
            <button
              onClick={exportPack}
              disabled={exporting}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white font-medium shadow-md transition-all duration-200 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
              {exporting ? 'Compiling pack…' : 'Export Pack (.zip)'}
            </button>
          </div>
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/CampaignBatchPanel.tsx
git commit -m "feat: add Export Pack (.zip) button to Campaign Batch Engine panel"
```

---

## Task 4: Final Verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Manual browser check**

Navigate to `/sandbox`, open Campaign Engine:
1. Fill in a campaign goal and target audience, click "Generate Full Campaign". Wait for the batch to render.
2. Click "Export Pack (.zip)". Confirm the button shows a spinner and label changes to "Compiling pack…", then a `.zip` downloads and a success toast ("Campaign pack downloaded") appears.
3. Unzip the downloaded file and confirm it contains: `README.txt` (with the campaign goal, target audience, org, timestamp, and an AD CREATIVE section), `copy-variations.json` (5 angle objects), `copy-variations.csv` (opens with 3 columns: Angle, Headline, Primary Text), `storyboard-summary.md` (one block per generated beat).
4. Confirm `voiceover-audio/` is absent from the zip (Campaign Batch's beats never carry an `audioUrl`), and confirm `README.txt` has no NOTES section in this case (no audio fetch was attempted, so no failure note either).
5. Confirm no console errors during the whole flow.

- [ ] **Step 3: Confirm no regressions**

Confirm "Batch Stage Campaign" still works unaffected (click it, confirm assets still get staged) — the two buttons are independent actions sharing a row.
