# Generation Call Retry/Backoff + Inline Retry UI — Design

## Context

This is the first of three sub-projects requested under a "Sandbox Robustness & Resilience Pass"
(the other two — generation history/persistence, and a ZIP export endpoint — are independent and
will get their own specs). This spec covers only: wrapping Creative Sandbox generation calls with
exponential-backoff retry, and showing an inline retry affordance when generation ultimately fails.

## Scope Decisions

**Retry applies to generation calls only, not mutations.** The sandbox's `fetch` call sites split
cleanly into two categories:
- **Generation/analysis calls** (`/api/sandbox/generate`, `/landing-page`, `/campaign-batch`,
  `/analyze-swipe`, `/generate-voice`, `/extract-brand`) — read-only LLM calls, no DB write, safe
  to retry blindly.
- **Mutation calls** (`/api/sandbox/assets` POST/PATCH/DELETE, `/deploy`, `/brand` POST) — write to
  the DB. A `502`/`503` on these can mean "the write succeeded server-side but the response was
  lost," so blind retry risks duplicate writes. These are explicitly **out of scope** and keep
  today's toast-only error handling, unchanged.

**Within generation calls, only the 6 primary "Generate" buttons are wrapped:** Copy Studio, Ad
Builder, Video Lab (storyboard generation), Landing Page Studio, Campaign Batch, Swipe Analyzer.
Secondary generation-shaped calls — `ScoreBadge`'s optimize/refine call, Video Lab's per-beat
voiceover generation, and Brand DNA's URL extraction — are **out of scope** for this pass. They
have their own dedicated loading UI (per-item loading state, drawer state) that doesn't fit the
"replace the empty-draft placeholder with a Retry button" pattern the 6 primary panels share.

**Retries are silent.** Backoff attempts happen behind the existing loading spinner with no visible
attempt counter. Only after all attempts are exhausted does the panel show an inline failure state.

## Architecture

New function in `src/lib/sandboxClientFetch.ts` (alongside the existing `fetchJsonArray`, which
already establishes the "centralize the fetch guard so every panel doesn't reinvent it" pattern):

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
      // Network-level failure (e.g. offline) — always retryable.
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

Three explicit branches per attempt: a network-level throw always retries with backoff; an `ok`
response returns immediately; a non-`ok` response retries with backoff only if its status is in
`RETRYABLE_STATUSES` and attempts remain, otherwise it throws immediately (no delay).

**Contract:** resolves with parsed JSON on any `2xx` response. Rejects with an `Error` (message from
the server's `{error}` body when available, otherwise a generic message) once attempts are
exhausted or on a non-retryable status. Callers use it as a drop-in replacement for their current
`fetch` + `res.json()` + `if (!res.ok) throw` block — no change to their `catch (err) { toast.error
(err.message) }` handling.

## Call Sites

Each of the 6 panels' primary `generate` function changes from:
```ts
const res = await fetch('/api/sandbox/...', { method: 'POST', ... });
const data = await res.json();
if (!res.ok) throw new Error(data.error || '...');
```
to:
```ts
const data = await fetchGenerationJson('/api/sandbox/...', { method: 'POST', ... });
```

Each panel also gains a `generationFailed` boolean state:
- Set to `false` at the start of `generate()`.
- Set to `true` in the `catch` block, alongside the existing `toast.error(...)`.

## UI

Where each panel currently renders an empty-state placeholder (e.g. VideoLabPanel's "Set your brief
and tone, then generate to see the storyboard here."), add a conditional: when
`generationFailed && !draft` (or the panel's equivalent "no result yet" condition), render instead:

```tsx
<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
  <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
  <button
    onClick={generate}
    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
  >
    <RefreshCw className="w-3.5 h-3.5" /> Retry
  </button>
</div>
```

Exact placement/markup adapts to each panel's existing empty-state block (they're not identical
across the 6 files) — the plan will show the precise diff per file. The toast still fires too, so
a user who's mid-scroll or focused elsewhere still gets immediate feedback.

## Error Handling

- Non-retryable statuses (400 validation errors, 401, etc.) surface immediately — no wasted retries
  on a request that will never succeed.
- A generation call that fails all 3 attempts leaves the rest of the sandbox workspace fully
  interactive — this is already true today (each panel's state is independent, failures are scoped
  to `try/catch` inside one `generate()` call) and isn't changed by this work; no additional
  "workspace stays interactive" code is needed beyond not introducing a global loading lock.

## Out of Scope

- Retrying mutation calls (asset save/update/delete, deploy, brand save).
- Retry-wrapping secondary generation calls (ScoreBadge optimize, per-beat voiceover, Brand DNA
  extraction).
- Visible retry-attempt counters/progress in the UI.
- Server-side retry or queueing (this is a client-side concern only — the sandbox routes
  themselves are unchanged).
- Jitter on backoff delays — fixed `400ms`/`800ms` is sufficient for a 3-attempt client-side UI
  retry with a single user, not a high-concurrency scenario. `ponytail: no jitter, add if this ever
  runs under concurrent load that causes thundering-herd retries`.

## Testing

No test framework in this repo. A standalone script (run via `npx tsx`, deleted after, same pattern
as prior specs) monkey-patches global `fetch` to simulate three scenarios and asserts
`fetchGenerationJson`'s behavior:
1. Fails with `503` twice, then returns `200` — assert it resolves with the success payload (proves
   retry-then-succeed).
2. Throws a network error every call — assert it rejects after exactly 3 attempts (proves the
   network-throw path retries and eventually gives up).
3. Returns `400` immediately — assert it rejects on the first attempt with no retry delay (proves
   non-retryable statuses don't waste retries).

Live browser verification: Playwright's `page.route()` intercepts one panel's generation endpoint
to force failures, confirming (a) a transient-then-success sequence resolves without any visible
error, and (b) an always-failing sequence surfaces the inline Retry card, and clicking it re-runs
generation successfully once the route stops failing.
