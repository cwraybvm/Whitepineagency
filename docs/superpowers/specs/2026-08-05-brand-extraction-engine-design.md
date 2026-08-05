# Brand Extraction Engine Design

**Goal:** Add a reusable lib function, `extractBrandFromUrl(url)`, that scrapes a client website and returns a richer brand-identity object than the existing `/api/sandbox/extract-brand` route produces — brand name, colors, top images, verbatim high-converting copy snippets ("key verbal tracks"), observed ad angles, audience profile, value props, and voice. This is lib-only groundwork (no route/UI wiring) for a later step.

**Non-goals:** Replacing or modifying the existing `/api/sandbox/extract-brand` route, `BrandExtractSchema`, `BRAND_EXTRACT_PROMPT`, or `mockBrandExtraction` — those stay exactly as shipped. No vision/image-model calls. No new npm dependencies (`cheerio`, `zod`, existing LLM provider chain already installed).

## Architecture

Three files, following the codebase's existing separation of concerns (parsing helpers / schema+prompt+LLM-call / orchestration):

### 1. `src/lib/htmlExtract.ts` (extend existing file)

Add three exports, alongside the existing `stripToPlainText` / `extractHexColors`:

- `fetchHtmlWithLimits(url: string): Promise<string>` — lifts the route's current private `fetchPageWithLimits` (8s abort timeout, 300KB read cap, streamed decode) into a shared, exported helper. The existing route (`src/app/api/sandbox/extract-brand/route.ts`) is left untouched — it keeps its own private copy. Nothing about its behavior changes.
- `extractImageUrls(html: string, baseUrl: string): string[]` — collects `<meta property="og:image">`, `<link rel="icon"|"shortcut icon"|"apple-touch-icon">`, and `<img src>` attributes. Resolves each relative to `baseUrl` via `new URL(src, baseUrl)`, drops anything that fails to parse or is a `data:` URI, dedupes, caps at 20.
- `extractPageTitle(html: string): string` — returns the `<title>` text (empty string if absent), used as an LLM context hint for `brandName`.

### 2. `src/lib/sandboxPrompts.ts` (extend existing file)

New, separately-named exports — no interaction with the existing brand-extraction exports:

- `ExtractedBrandIdentitySchema` (Zod), matching the task's 8 fields, each with a `.catch()` default in the same style as every other schema in the file (`z.string().catch('')`, `z.array(z.string()).catch([])`):
  ```ts
  export const ExtractedBrandIdentitySchema = z.object({
    brandName: z.string().catch(''),
    colors: z.array(z.string()).catch([]),
    brandImages: z.array(z.string()).catch([]),
    keyVerbalTracks: z.array(z.string()).catch([]),
    activeAdAngles: z.array(z.string()).catch([]),
    targetAudienceProfile: z.string().catch(''),
    coreValueProps: z.array(z.string()).catch([]),
    brandVoice: z.string().catch(''),
  });
  export type ExtractedBrandIdentity = z.infer<typeof ExtractedBrandIdentitySchema>;
  ```
- `BRAND_IDENTITY_EXTRACT_PROMPT` (string) — system prompt instructing the LLM to: pick/order up to 6 real hex codes from the supplied candidates (best guess if none look brand-like); choose up to 8 image URLs from the supplied candidate list that look like logos/hero/product shots (never invent URLs); mine `keyVerbalTracks` as short verbatim-or-near-verbatim phrases copied from the supplied page text (unique terminology, high-converting copy lines — not paraphrases); infer `activeAdAngles` from any offer/promo/urgency language in the text; and produce `targetAudienceProfile`, `coreValueProps`, `brandVoice`, `brandName` from context (title hint + text). Returns one JSON object matching `ExtractedBrandIdentitySchema`'s shape exactly.
- `mockExtractedBrandIdentity(url: string): ExtractedBrandIdentity` — `[MOCK]`-prefixed plausible values for every field, same fallback convention as `mockBrandExtraction`, used when no LLM provider key is configured.

### 3. `src/lib/brandExtractor.ts` (new file)

```ts
export async function extractBrandFromUrl(url: string): Promise<ExtractedBrandIdentity>
```

Steps:
1. `validateExtractBrandUrl(url)` (reused from `sandboxPrompts.ts`, already SSRF-guarded) — throws on invalid input (mirrors how other lib functions in this codebase signal bad input; the future route step is responsible for turning a throw into a 400, same as the existing extract-brand route wraps its own POST body in try/catch).
2. `fetchHtmlWithLimits(url)` (from `htmlExtract.ts`).
3. Parse: `stripToPlainText`, `extractHexColors`, `extractImageUrls(html, url)`, `extractPageTitle`.
4. Build one `userContext` string: page title, page text (capped at `MAX_EXTRACT_CHARS`, reused constant), candidate hex colors, candidate image URLs — same join-and-filter style as the existing route's `userContext` construction.
5. `callOpenAiJson(BRAND_IDENTITY_EXTRACT_PROMPT, userContext, () => mockExtractedBrandIdentity(url), 0.7, ExtractedBrandIdentitySchema)` and return the result directly (already validated/defaulted by the schema).

## Error handling

Same posture as the rest of `sandboxPrompts.ts`/`htmlExtract.ts`: no new error classes. Fetch failures (timeout, non-2xx, network) propagate as thrown `Error`s, exactly like `fetchPageWithLimits` does today — a future route step catches and maps them to HTTP status codes, matching the existing `extract-brand` route's pattern. Schema validation never throws — invalid/missing LLM output is repaired field-by-field via `.catch()`, then the whole object degrades to schema defaults on a totally malformed response, matching `parseWithSchema`'s existing behavior.

## Testing

- Root-level throwaway `verify-brand-extractor.ts` (same pattern as prior plans' scratch verification scripts — untracked, deleted after use): stubs `fetchHtmlWithLimits` (or mocks `global.fetch`) to return a fixed HTML payload containing a title, inline-style hex colors, an `og:image` meta tag, a few `<img>` tags, and body copy with a distinctive phrase; asserts `extractBrandFromUrl` returns an `ExtractedBrandIdentity` with all 8 fields populated (non-empty strings, non-empty arrays) using the mock LLM fallback path (no API keys set locally).
- `npx tsc --noEmit` — zero errors.
