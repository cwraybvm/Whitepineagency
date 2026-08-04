# Generation Call Retry/Backoff + Inline Retry UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the 6 primary Creative Sandbox "Generate" calls with exponential-backoff retry (3 attempts, on network errors and `429`/`502`/`503`), and show an inline Retry card instead of the empty-state placeholder when generation ultimately fails.

**Architecture:** One new function `fetchGenerationJson` in `src/lib/sandboxClientFetch.ts`, alongside the existing `fetchJsonArray`. Each of the 6 panels swaps its raw `fetch`+`res.json()`+ok-check for a call to this function, adds a `generationFailed` boolean reset at the top of `generate()` and set in its `catch`, and renders a Retry card in place of its existing empty-state message when `generationFailed` is true and there's no result to show.

**Tech Stack:** No new dependencies. Pure client-side TypeScript/React change.

## Global Constraints

- Retry ONLY the 6 primary generation calls listed below. Mutation calls (asset save/update/
  delete, deploy, brand save) are NOT touched — they keep today's toast-only error handling.
- Secondary generation-shaped calls (`ScoreBadge` optimize, Video Lab per-beat voiceover,
  Brand DNA URL extraction, Swipe Analyzer's `runRemix`) are NOT touched — only each panel's
  first/primary generation action is wrapped.
- `MAX_ATTEMPTS = 3`, backoff delays `[400, 800]` ms, retryable statuses `{429, 502, 503}`.
- Retries are silent — no visible attempt counter. A toast still fires on final failure (existing
  behavior), in addition to the new inline card.
- No new npm dependencies.

---

### Task 1: `fetchGenerationJson` in `sandboxClientFetch.ts`

**Files:**
- Modify: `src/lib/sandboxClientFetch.ts`

**Interfaces:**
- Produces: `fetchGenerationJson(url: string, options: RequestInit): Promise<any>` — resolves with
  parsed JSON body on any `2xx` response; rejects with an `Error` (server's `{error}` message when
  available) after retries are exhausted or immediately on a non-retryable status.

- [ ] **Step 1: Write a standalone verification script (run before implementing, expect failure)**

Create `verify-retry.ts` at the repo root (untracked scratch file, deleted at the end of this task):

```ts
import { fetchGenerationJson } from './src/lib/sandboxClientFetch';

function mockFetchSequence(responses: Array<{ status: number } | 'throw'>) {
  let call = 0;
  (global as any).fetch = async (_url: string, _opts: any) => {
    const step = responses[Math.min(call, responses.length - 1)];
    call++;
    if (step === 'throw') throw new TypeError('network error');
    return {
      ok: step.status >= 200 && step.status < 300,
      status: step.status,
      json: async () => (step.status >= 200 && step.status < 300 ? { success: true } : { error: `status ${step.status}` }),
    };
  };
  return () => call;
}

async function main() {
  let failed = 0;

  // 1. Fails 503 twice then succeeds — should resolve.
  {
    const getCalls = mockFetchSequence([{ status: 503 }, { status: 503 }, { status: 200 }]);
    const result = await fetchGenerationJson('/x', {});
    if (!result?.success || getCalls() !== 3) {
      console.error('FAIL: retry-then-succeed', result, getCalls());
      failed++;
    } else {
      console.log('ok: retry-then-succeed');
    }
  }

  // 2. Always throws (network error) — should reject after exactly 3 attempts.
  {
    const getCalls = mockFetchSequence(['throw', 'throw', 'throw']);
    try {
      await fetchGenerationJson('/x', {});
      console.error('FAIL: expected rejection on always-throw');
      failed++;
    } catch {
      if (getCalls() !== 3) {
        console.error('FAIL: always-throw should attempt exactly 3 times, got', getCalls());
        failed++;
      } else {
        console.log('ok: always-throw rejects after 3 attempts');
      }
    }
  }

  // 3. Returns 400 immediately — should reject on the FIRST attempt, no retry.
  {
    const getCalls = mockFetchSequence([{ status: 400 }, { status: 200 }, { status: 200 }]);
    try {
      await fetchGenerationJson('/x', {});
      console.error('FAIL: expected rejection on 400');
      failed++;
    } catch {
      if (getCalls() !== 1) {
        console.error('FAIL: 400 should not retry, got', getCalls(), 'calls');
        failed++;
      } else {
        console.log('ok: 400 rejects immediately, no retry');
      }
    }
  }

  if (failed) {
    console.error(`${failed} case(s) failed`);
    process.exit(1);
  }
  console.log('All cases passed');
}

main();
```

Run from the repo root: `npx tsx verify-retry.ts`. Expected: fails to import — `fetchGenerationJson`
doesn't exist yet.

- [ ] **Step 2: Implement `fetchGenerationJson`**

Append to `src/lib/sandboxClientFetch.ts`:

```ts
const RETRYABLE_STATUSES = new Set([429, 502, 503]);
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [400, 800]; // delay before attempt 2, before attempt 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGenerationJson(url: string, options: RequestInit): Promise<any> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, options);
    } catch {
      if (attempt === MAX_ATTEMPTS) throw new Error('Network error — please check your connection');
      await sleep(BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (res.ok) return res.json().catch(() => ({}));

    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    if (!RETRYABLE_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) throw error;
    await sleep(BACKOFF_MS[attempt - 1]);
  }
  throw new Error('Request failed'); // unreachable — loop above always returns or throws
}
```

- [ ] **Step 3: Run the verification script again, expect pass**

`npx tsx verify-retry.ts` from the repo root. Expected: `All cases passed`.

- [ ] **Step 4: Delete the scratch script and commit**

```bash
rm verify-retry.ts
git add src/lib/sandboxClientFetch.ts
git commit -m "feat: add fetchGenerationJson retry/backoff helper"
```

---

### Task 2: `CopyStudioPanel.tsx` integration

**Files:**
- Modify: `src/components/sandbox/CopyStudioPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1).

Copy Studio has three modes (`single`, `matrix`, `dco`), each with its own empty-state block, but
one shared `generate()` function that branches on `mode`. One `generationFailed` boolean covers
all three — `generate()` already re-checks `mode` on every call, so Retry re-runs whichever mode
was active.

- [ ] **Step 1: Add `RefreshCw` import and a local notice component**

At the top of the file, change:
```ts
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket, RefreshCw } from 'lucide-react';
```

After the `MODES` array declaration (around line 17), add:
```ts
function GenerationFailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
```
to:
```ts
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
```

- [ ] **Step 3: Reset/set `generationFailed` in `generate()`, use `fetchGenerationJson`**

Replace the whole `generate` function body:

```ts
  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    setDraft(null);
    setAngleDrafts([]);
    setDcoVariants([]);
    try {
      if (mode === 'dco') {
        const locationList = locations.split(',').map((s) => s.trim()).filter(Boolean);
        const segmentList = audienceSegments.split(',').map((s) => s.trim()).filter(Boolean);
        if (locationList.length === 0 || segmentList.length === 0) {
          toast.error('Add at least one location and one audience segment');
          return;
        }
        const data = await fetchGenerationJson('/api/sandbox/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'copy',
            mode: 'dco',
            prompt,
            organizationId: organizationId || undefined,
            locations: locationList,
            audienceSegments: segmentList,
          }),
        });
        setDcoVariants(data.variants);
        return;
      }

      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'copy',
          prompt,
          tone,
          organizationId: organizationId || undefined,
          mode: mode === 'matrix' ? 'matrix' : 'single',
        }),
      });
      if (mode === 'matrix') {
        setAngleDrafts(data.angles);
      } else {
        setDraft({ title: data.title, content: data.content });
      }
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  };
```

- [ ] **Step 4: Add `fetchGenerationJson` to the import from `sandboxClientFetch`**

Change:
```ts
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 5: Update the three empty-state blocks**

Matrix mode empty state — change:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Set your brief, then generate to see all 5 angles here.
          </div>
        )
```
to:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your brief, then generate to see all 5 angles here.'}
          </div>
        )
```

DCO mode empty state — change:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Set your base offer, locations, and audience segments, then generate the personalization matrix here.
          </div>
        )
```
to:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[360px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your base offer, locations, and audience segments, then generate the personalization matrix here.'}
          </div>
        )
```

Single mode empty state — change:
```tsx
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
              Set your brief and tone, then generate to see the draft here.
            </div>
          )}
```
to:
```tsx
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
              {generationFailed ? <GenerationFailedNotice onRetry={generate} /> : 'Set your brief and tone, then generate to see the draft here.'}
            </div>
          )}
```

- [ ] **Step 6: Verify in browser**

With the dev server running, use Playwright's `page.route()` to intercept `/api/sandbox/generate`
and force 3 consecutive `503`s. Confirm the inline Retry card appears in place of the empty-state
message, then remove the route interception and click Retry — confirm it generates successfully.

- [ ] **Step 7: Commit**

```bash
git add src/components/sandbox/CopyStudioPanel.tsx
git commit -m "feat: retry-wrap Copy Studio generation with inline Retry UI"
```

---

### Task 3: `AdBuilderPanel.tsx` integration

**Files:**
- Modify: `src/components/sandbox/AdBuilderPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1).

- [ ] **Step 1: Import `fetchGenerationJson` and `RefreshCw`**

Change:
```ts
import { Wand2, Save, Loader2, ImageUp } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, ImageUp, RefreshCw } from 'lucide-react';
```
Change:
```ts
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AdDraft | null>(null);
```
to:
```ts
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AdDraft | null>(null);
```

- [ ] **Step 3: Update `generate()`**

Replace:
```ts
  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ad', prompt, tone, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft({ title: data.title, content: data.content, metadata: data.metadata });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate ad');
    } finally {
      setGenerating(false);
    }
  };
```
with:
```ts
  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ad', prompt, tone, platform }),
      });
      setDraft({ title: data.title, content: data.content, metadata: data.metadata });
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate ad');
    } finally {
      setGenerating(false);
    }
  };
```

- [ ] **Step 4: Add a failed-state block**

Unlike the other panels, Ad Builder has no textual empty-state placeholder — `AdMockupCard` always
renders a live preview (showing its own built-in placeholder look when `draft` is null), and only
the Save/Score controls are conditional on `draft`. Add a new conditional block for the failed
state, in the same spot the `draft &&` block already lives:

Change:
```tsx
        {draft && (
          <>
            <ScoreBadge
              content={draft.content}
              type="AD"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content, metadata: r.metadata || draft.metadata })}
            />
            <button
              onClick={saveToStaged}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </>
        )}
```
to:
```tsx
        {generationFailed && !draft && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
            <button
              onClick={generate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {draft && (
          <>
            <ScoreBadge
              content={draft.content}
              type="AD"
              metadata={draft.metadata}
              onOptimized={(r) => setDraft({ title: r.title || draft.title, content: r.content, metadata: r.metadata || draft.metadata })}
            />
            <button
              onClick={saveToStaged}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </>
        )}
```

- [ ] **Step 5: Verify in browser** — same `page.route()` approach as Task 2, targeting this panel.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/AdBuilderPanel.tsx
git commit -m "feat: retry-wrap Ad Builder generation with inline Retry UI"
```

---

### Task 4: `VideoLabPanel.tsx` integration (storyboard generation only)

**Files:**
- Modify: `src/components/sandbox/VideoLabPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1). Does NOT touch `generateBeatAudio` (per-beat
  voiceover) — out of scope per the spec.

- [ ] **Step 1: Import `fetchGenerationJson` and `RefreshCw`**

Change:
```ts
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic, RefreshCw } from 'lucide-react';
```
Add near the top (this file currently has no `sandboxClientFetch` import):
```ts
import { fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<VideoDraft | null>(null);
```
to:
```ts
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<VideoDraft | null>(null);
```

- [ ] **Step 3: Update `generate()`**

Replace:
```ts
  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'video', prompt, tone, lengthSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const beats: Beat[] = (data.metadata.beats || []).map((b: Beat) => ({
        ...b,
        duration: b.duration || '3s',
        cameraMovement: b.cameraMovement || 'Static',
      }));
      setDraft({ title: data.title, content: data.content, metadata: { beats } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };
```
with:
```ts
  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'video', prompt, tone, lengthSeconds }),
      });
      const beats: Beat[] = (data.metadata.beats || []).map((b: Beat) => ({
        ...b,
        duration: b.duration || '3s',
        cameraMovement: b.cameraMovement || 'Static',
      }));
      setDraft({ title: data.title, content: data.content, metadata: { beats } });
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };
```

- [ ] **Step 4: Update the empty-state block**

Change:
```tsx
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Set your brief and length, then generate to see the storyboard here.
          </div>
        )}
```
to:
```tsx
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? (
              <>
                <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
                <button
                  onClick={generate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </>
            ) : (
              'Set your brief and length, then generate to see the storyboard here.'
            )}
          </div>
        )}
```

- [ ] **Step 5: Verify in browser** — same `page.route()` approach, targeting this panel's storyboard generation.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/VideoLabPanel.tsx
git commit -m "feat: retry-wrap Video Lab storyboard generation with inline Retry UI"
```

---

### Task 5: `LandingPageStudioPanel.tsx` integration

**Files:**
- Modify: `src/components/sandbox/LandingPageStudioPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1).

- [ ] **Step 1: Import `fetchGenerationJson` and `RefreshCw`**

Change:
```ts
import { Wand2, Save, Loader2, Quote, CheckCircle2, ArrowRight, LayoutPanelTop } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, Quote, CheckCircle2, ArrowRight, LayoutPanelTop, RefreshCw } from 'lucide-react';
```
Change:
```ts
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);
```
to:
```ts
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);
```

- [ ] **Step 3: Update `generate()`**

Replace:
```ts
    setGenerating(true);
    try {
      const body =
        sourceMode === 'asset'
          ? { mode: 'asset', assetId, organizationId: organizationId || undefined }
          : { mode: 'brief', prompt, organizationId: organizationId || undefined };
      const res = await fetch('/api/sandbox/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft({ title: data.title, content: data.content, metadata: normalizeMetadata(data.metadata) });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate landing page');
    } finally {
      setGenerating(false);
    }
```
with:
```ts
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const body =
        sourceMode === 'asset'
          ? { mode: 'asset', assetId, organizationId: organizationId || undefined }
          : { mode: 'brief', prompt, organizationId: organizationId || undefined };
      const data = await fetchGenerationJson('/api/sandbox/landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setDraft({ title: data.title, content: data.content, metadata: normalizeMetadata(data.metadata) });
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate landing page');
    } finally {
      setGenerating(false);
    }
```

- [ ] **Step 4: Update the empty-state block**

Change:
```tsx
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Pick a source and generate to see the landing page sections here.
          </div>
        )}
```
to:
```tsx
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? (
              <>
                <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
                <button
                  onClick={generate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </>
            ) : (
              'Pick a source and generate to see the landing page sections here.'
            )}
          </div>
        )}
```

- [ ] **Step 5: Verify in browser** — same `page.route()` approach targeting `/api/sandbox/landing-page`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/LandingPageStudioPanel.tsx
git commit -m "feat: retry-wrap Landing Page Studio generation with inline Retry UI"
```

---

### Task 6: `CampaignBatchPanel.tsx` integration

**Files:**
- Modify: `src/components/sandbox/CampaignBatchPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1).

This panel currently renders nothing at all when `batch` is `null` (no existing empty-state block
to adapt) — this task adds one, matching the pattern used elsewhere.

- [ ] **Step 1: Import `fetchGenerationJson` and `RefreshCw`**

Change:
```ts
import { Wand2, Loader2, Rocket, Clapperboard, MessageSquareText } from 'lucide-react';
```
to:
```ts
import { Wand2, Loader2, Rocket, Clapperboard, MessageSquareText, RefreshCw } from 'lucide-react';
```
Change:
```ts
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [generating, setGenerating] = useState(false);
  const [staging, setStaging] = useState(false);
  const [batch, setBatch] = useState<CampaignBatch | null>(null);
```
to:
```ts
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [staging, setStaging] = useState(false);
  const [batch, setBatch] = useState<CampaignBatch | null>(null);
```

- [ ] **Step 3: Update `generate()`**

Replace:
```ts
  const generate = async () => {
    setGenerating(true);
    setBatch(null);
    try {
      const res = await fetch('/api/sandbox/campaign-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organizationId || undefined, campaignGoal, targetAudience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Campaign generation failed');
      setBatch(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };
```
with:
```ts
  const generate = async () => {
    setGenerating(true);
    setGenerationFailed(false);
    setBatch(null);
    try {
      const data = await fetchGenerationJson('/api/sandbox/campaign-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organizationId || undefined, campaignGoal, targetAudience }),
      });
      setBatch(data);
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };
```

- [ ] **Step 4: Add an empty/failed-state block**

Change:
```tsx
      {batch && (
        <div className="space-y-6">
```
to:
```tsx
      {generationFailed && !batch && (
        <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
          <button
            onClick={generate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {batch && (
        <div className="space-y-6">
```

- [ ] **Step 5: Verify in browser** — same `page.route()` approach targeting `/api/sandbox/campaign-batch`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/CampaignBatchPanel.tsx
git commit -m "feat: retry-wrap Campaign Batch generation with inline Retry UI"
```

---

### Task 7: `SwipeAnalyzerPanel.tsx` integration (analyze only, not remix)

**Files:**
- Modify: `src/components/sandbox/SwipeAnalyzerPanel.tsx`

**Interfaces:**
- Consumes: `fetchGenerationJson` (Task 1). Does NOT touch `runRemix` — out of scope, same reasoning
  as the other secondary generation calls (own dedicated flow, not the panel's primary action).

- [ ] **Step 1: Import `fetchGenerationJson` and `RefreshCw`**

Change:
```ts
import { ScanSearch, Save, Loader2, ImageUp, Sparkles } from 'lucide-react';
```
to:
```ts
import { ScanSearch, Save, Loader2, ImageUp, Sparkles, RefreshCw } from 'lucide-react';
```
Change:
```ts
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
```

- [ ] **Step 2: Add `generationFailed` state**

Change:
```ts
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<SwipeInsights | null>(null);
```
to:
```ts
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [insights, setInsights] = useState<SwipeInsights | null>(null);
```

(Named `analysisFailed` here, not `generationFailed` — this panel's primary action is "analyze,"
matching its existing `analyzing` state naming.)

- [ ] **Step 3: Update `analyze()`**

Replace:
```ts
  const analyze = async () => {
    setAnalyzing(true);
    setInsights(null);
    setRemix(null);
    try {
      const res = await fetch('/api/sandbox/analyze-swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setInsights({
        hookPattern: data.hookPattern,
        visualStyle: data.visualStyle,
        targetAudience: data.targetAudience,
        emotionalTrigger: data.emotionalTrigger,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };
```
with:
```ts
  const analyze = async () => {
    setAnalyzing(true);
    setAnalysisFailed(false);
    setInsights(null);
    setRemix(null);
    try {
      const data = await fetchGenerationJson('/api/sandbox/analyze-swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', imageUrl }),
      });
      setInsights({
        hookPattern: data.hookPattern,
        visualStyle: data.visualStyle,
        targetAudience: data.targetAudience,
        emotionalTrigger: data.emotionalTrigger,
      });
    } catch (err: any) {
      setAnalysisFailed(true);
      toast.error(err.message || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };
```

- [ ] **Step 4: Update the empty-state block**

Change:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Paste a competitor ad image URL and Deconstruct Ad to see the breakdown here.
          </div>
        )}
```
to:
```tsx
        ) : (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400 text-sm">
            {analysisFailed ? (
              <>
                <p className="text-sm text-red-500 dark:text-red-400">Analysis failed. This can happen during high demand.</p>
                <button
                  onClick={analyze}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </>
            ) : (
              'Paste a competitor ad image URL and Deconstruct Ad to see the breakdown here.'
            )}
          </div>
        )}
```

- [ ] **Step 5: Verify in browser** — same `page.route()` approach targeting `/api/sandbox/analyze-swipe` with `{action: 'analyze'}` bodies only (leave remix untouched).

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/SwipeAnalyzerPanel.tsx
git commit -m "feat: retry-wrap Swipe Analyzer analysis with inline Retry UI"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Browser walkthrough — one full failure+retry cycle**

Pick one panel (e.g. Copy Studio). With the dev server running, use Playwright to intercept its
generation endpoint via `page.route()`, force 3 consecutive `503` responses, confirm the inline
Retry card renders (not just a toast), then clear the route interception and click Retry —
confirm it generates successfully and the card is replaced by the real draft.

- [ ] **Step 3: Browser walkthrough — transient failure recovers silently**

Same panel, intercept the route to fail twice then succeed on the 3rd call. Confirm the generation
completes successfully with no visible error state (the retries happen behind the spinner).

- [ ] **Step 4: Confirm other tabs remain interactive during a failing generation**

While one panel is mid-retry (e.g. artificially slow the mocked route), switch to another sandbox
tab and confirm it's fully responsive — this should already hold true (each panel's state is
independent) but is worth a quick manual confirmation since the spec calls it out explicitly.
