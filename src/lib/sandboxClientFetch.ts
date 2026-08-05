// Every Creative Sandbox panel independently fetched org/asset lists with
// `fetch(url).then(res => res.json()).then(setState)` — no `.ok` check, no
// shape check. A non-2xx response (e.g. a transient DB error) returns an
// `{error}` object instead of an array, which got set as state directly and
// crashed the first `.find()`/`.map()` render downstream with an uncaught
// TypeError — the actual cause of two separate "Creative Sandbox couldn't
// load" reports. Centralized here so the guard only needs writing once.
export async function fetchJsonArray<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

const RETRYABLE_STATUSES = new Set([429, 502, 503]);
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [400, 800]; // delay before attempt 2, before attempt 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sandbox generation calls (LLM-backed, read-only) hit OpenAI under the hood
// and can transiently 429/502/503 under load. Retries with backoff here so
// the UI doesn't surface a hard failure for what's often a one-shot blip —
// mutation calls (asset save/delete, deploy) deliberately do NOT use this,
// since a lost response on a write risks a duplicate on blind retry.
export async function fetchGenerationJson(url: string, options: RequestInit): Promise<any> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, options);
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      if (attempt === MAX_ATTEMPTS) throw new Error('Network error — please check your connection');
      await sleep(BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (res.ok) return res.json().catch((err: any) => { if (err?.name === 'AbortError') throw err; return {}; });

    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    if (!RETRYABLE_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) throw error;
    await sleep(BACKOFF_MS[attempt - 1]);
  }
  throw new Error('Request failed'); // unreachable — loop above always returns or throws
}
