# Blog Post Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Blog Post Studio" tool to the AI Creative Sandbox that turns raw notes or a pasted draft — plus optional reference media — into a structured, SEO-optimized blog post with a live preview, per-field AI refinement, staged-asset saving with the existing quality-score loop, and multi-format export (HTML, Markdown, JSON, WordPress).

**Architecture:** Zod schema + prompt in `sandboxPrompts.ts` (matching every sibling tool). A thin `src/lib/blogPost.ts` wrapper calls the existing `callOpenAiJson` multi-provider chain with a `[MOCK]` fallback. A thin API route validates and delegates. `BLOG_POST` is added as a `ScorableType` so the existing `ScoreBadge`/staged-assets/section-refine machinery works unmodified. A pure `blogPostHtml.ts` renderer (using `marked` for Markdown→HTML) feeds the same `<iframe srcDoc>` live-preview pattern already proven in `LandingPageStudioPanel`. The orchestrator panel follows `LandingPageStudioPanel`'s structure closely, with a Direct-Mail-Studio-style editable list for the media inputs.

**Tech Stack:** Next.js API routes, Zod, React (client components), `marked` (new dependency), `fetchJsonArray`/`fetchGenerationJson` from `@/lib/sandboxClientFetch`.

## Global Constraints

- Full design spec: `docs/superpowers/specs/2026-08-05-blog-post-studio-design.md` — read it before starting if anything below is ambiguous.
- **Client-bundle rule (learned the hard way on Direct Mail Studio):** `src/lib/sandboxPrompts.ts` has a top-level `import { prisma } from '@/lib/prisma'`. Any **runtime value** (not just a TS type) imported from that file by a `'use client'` component drags the whole module — including `prisma`/`pg` — into the client bundle and breaks `npm run build` with `Module not found: Can't resolve 'fs'/'net'/'tls'/'dns'`. Type-only imports (`import type { X } from '@/lib/sandboxPrompts'`) are always safe — they're erased at compile time. This is why `BlogPostToneOptions` (a runtime `const` array the panel needs for `.map()`) goes in `src/components/sandbox/types.ts` (already client-safe, zero imports, home to `TONE_OPTIONS`/`FormFactorOptions` for the same reason) — **not** in `sandboxPrompts.ts`. `MediaAsset`/`BlogPostPackage` (types only, used type-only by the client) are fine to stay defined in `sandboxPrompts.ts`.
- No new provider/mock-fallback conventions — this route keeps `mockBlogPostPackage` exactly like every other generation tool (`mockLandingPage`, `mockDirectMailPackage`, etc.).
- Reuses `/api/sandbox/landing-page/refine-section` as-is for section refine (it's already field/instruction/currentValue-generic despite the URL). Do not create a new refine endpoint.
- Reuses `/api/wordpress` as-is for the WordPress push — passing `postType: 'posts'` (the route only special-cases `'pages'`; anything else, including omitting the field, already resolves to `posts`, but pass it explicitly for clarity).
- No automated test framework exists in this repo for sandbox tools. Every task's verification is `npx tsc --noEmit` plus either `npm run build` or a manual reasoning check — there is no `pytest`/`jest`-equivalent step to add. A full interactive browser check is not possible in this environment (no `chromium-cli`/Playwright, and `/sandbox` is auth-gated so `curl` can't reach it) — flag this gap in the final report rather than silently skipping it.
- **Dev-server hygiene:** if you run `npm run dev` for any manual check, it regenerates `public/sw.js`/`public/workbox-*.js` (PWA service worker) as a side effect — these are unrelated build artifacts. Run `git status --short` before every commit and `git checkout -- public/sw.js public/workbox-*.js` (plus `rm -f` any new untracked `workbox-*.js`) to revert them if present. Stop the dev server (`kill` the port-3000 listener) once done so it stops regenerating them.

---

### Task 1: Add `marked` dependency

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)

- [ ] **Step 1: Install**

Run: `npm install marked`
Expected: `package.json` gains a `"marked": "^18.x.x"` entry under `dependencies`; `package-lock.json` updates.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add marked for blog post markdown rendering"
```

---

### Task 2: Client-safe constants — `BlogPostToneOptions` and the sandbox tab id

**Files:**
- Modify: `src/components/sandbox/types.ts`

**Interfaces:**
- Produces: `BlogPostToneOptions`, `BlogPostTone` — consumed by Task 3 (`sandboxPrompts.ts`) and Task 8 (`BlogPostStudioPanel.tsx`). `'blog-post'` added to `SandboxTool` — consumed by Task 13 (page wiring).

- [ ] **Step 1: Add the tone options and the tool id**

In `src/components/sandbox/types.ts`, change line 1 from:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe' | 'landing-page' | 'brand-identity' | 'master-campaign' | 'compliance-audit' | 'direct-mail';
```

to:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe' | 'landing-page' | 'brand-identity' | 'master-campaign' | 'compliance-audit' | 'direct-mail' | 'blog-post';
```

Then add this block directly below the `FormFactorOptions`/`FormFactor` block (after line 7):

```ts
export const BlogPostToneOptions = ['informative', 'storytelling', 'thought_leadership', 'promotional'] as const;
export type BlogPostTone = (typeof BlogPostToneOptions)[number];
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/types.ts
git commit -m "feat: add blog post tone options and sandbox tab id"
```

---

### Task 3: Data layer — schema, prompt, mock, validation

**Files:**
- Modify: `src/lib/sandboxPrompts.ts`

**Interfaces:**
- Consumes (from Task 2): `BlogPostToneOptions`, `type BlogPostTone` from `@/components/sandbox/types`.
- Produces: `MediaAssetSchema`, `type MediaAsset`, `BlogPostPackageSchema`, `type BlogPostPackage`, `BLOG_POST_PROMPT`, `mockBlogPostPackage(text: string, mode: 'notes' | 'draft'): BlogPostPackage`, `validateBlogPostInput(body: any): string | null` — consumed by Task 6 (`blogPost.ts`/route), Task 7 (`blogPostHtml.ts`, type-only), Task 8+ (`BlogPostStudioPanel.tsx`, type-only).

- [ ] **Step 1: Import the client-safe tone constant**

In `src/lib/sandboxPrompts.ts`, change the import block at the top from:

```ts
import { prisma } from '@/lib/prisma';
import type { ScorableType } from '@/lib/creativeScore';
import { FormFactorOptions, type FormFactor } from '@/components/sandbox/types';
```

to:

```ts
import { prisma } from '@/lib/prisma';
import type { ScorableType } from '@/lib/creativeScore';
import { FormFactorOptions, type FormFactor, BlogPostToneOptions, type BlogPostTone } from '@/components/sandbox/types';
```

- [ ] **Step 2: Wire `BLOG_POST` into `basePromptForType`**

Change:

```ts
export function basePromptForType(type: ScorableType): string {
  if (type === 'COPY') return SYSTEM_PROMPTS.copy;
  if (type === 'AD') return SYSTEM_PROMPTS.ad;
  if (type === 'VIDEO_SCRIPT') return SYSTEM_PROMPTS.video;
  if (type === 'LANDING_PAGE') return LANDING_PAGE_PROMPT;
  return DRIP_PROMPT;
}
```

to:

```ts
export function basePromptForType(type: ScorableType): string {
  if (type === 'COPY') return SYSTEM_PROMPTS.copy;
  if (type === 'AD') return SYSTEM_PROMPTS.ad;
  if (type === 'VIDEO_SCRIPT') return SYSTEM_PROMPTS.video;
  if (type === 'LANDING_PAGE') return LANDING_PAGE_PROMPT;
  if (type === 'BLOG_POST') return BLOG_POST_PROMPT;
  return DRIP_PROMPT;
}
```

(This function is a hoisted declaration whose body only resolves `BLOG_POST_PROMPT` when called at runtime, by which point the whole module — including the `const` added in Step 3 below, further down the file — has finished evaluating. Same reason `LANDING_PAGE_PROMPT` already works here despite being declared later in the file.)

- [ ] **Step 3: Append the schema, prompt, mock, and validator**

Add this block at the very end of `src/lib/sandboxPrompts.ts` (after `mockComplianceReport`'s closing `}`):

```ts

const MediaAssetSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().catch(''),
  caption: z.string().catch(''),
  altText: z.string().catch(''),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const BlogPostPackageSchema = z.object({
  title: z.string().catch(''),
  slug: z.string().catch(''),
  metaDescription: z.string().catch(''),
  excerpt: z.string().catch(''),
  readTimeMinutes: z.number().catch(3),
  targetKeywords: z.array(z.string()).catch([]),
  contentMarkdown: z.string().catch(''),
  suggestedMediaPlacements: z.array(
    z.object({
      placementTag: z.string().catch(''),
      contextNote: z.string().catch(''),
    })
  ).catch([]),
  callToAction: z.string().catch(''),
});
export type BlogPostPackage = z.infer<typeof BlogPostPackageSchema>;

export const BLOG_POST_PROMPT =
  'You are an expert SEO content strategist and blog writer for a local-service/agency marketing team. ' +
  'You are given an input mode (either raw notes to write a full post from scratch, or an existing draft to restructure and polish), a tone, a numbered list of available reference media (type and caption only, no URLs), and the raw text itself. ' +
  "If the input mode is notes: write a complete, original, well-structured blog post from those notes. " +
  "If the input mode is draft: restructure, polish, and SEO-optimize the existing draft — preserve the author's voice, claims, and facts, do not invent new content, only improve structure, clarity, and SEO framing. " +
  'Write contentMarkdown as well-formed Markdown using headings (##), paragraphs, and lists where appropriate. ' +
  'Where a piece of the provided reference media would genuinely strengthen a section, insert an inline placement marker in the exact form {{media:<placementTag>}} at that point in contentMarkdown, and add a matching entry to suggestedMediaPlacements with the same placementTag and a contextNote explaining what should go there and why — one marker per suggested placement, tags matching 1:1. Only suggest placements that genuinely help; do not force one if no media fits, and it is fine to suggest zero placements. ' +
  'Produce a title (ideally 50-60 characters, compelling and keyword-aware), a URL-safe slug (lowercase, hyphenated, derived from the title), a metaDescription (120-160 characters, naturally includes the primary keyword), a one-to-two-sentence excerpt, an estimated readTimeMinutes based on a 200-words-per-minute reading pace, 3 to 6 realistic targetKeywords, and a short callToAction line. ' +
  'Return a valid JSON object matching this structure exactly: {"title": "the post title", "slug": "url-safe-slug", "metaDescription": "120-160 character meta description", "excerpt": "one to two sentence excerpt", "readTimeMinutes": estimated integer minutes, "targetKeywords": ["3 to 6 target keywords"], "contentMarkdown": "the full post body as Markdown, including {{media:tag}} placement markers where relevant", "suggestedMediaPlacements": [{"placementTag": "tag matching a {{media:tag}} marker in contentMarkdown", "contextNote": "what should go here and why"}], "callToAction": "a short closing call-to-action line"}.';

export function mockBlogPostPackage(text: string, mode: 'notes' | 'draft'): BlogPostPackage {
  const hook = cleanHook(text, 'A Guide Worth Reading');
  const slug = hook.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mock-post';
  return {
    title: `[MOCK] ${hook}`,
    slug,
    metaDescription: `[MOCK — set OPENAI_API_KEY for real output] A quick, practical look at ${hook.toLowerCase()} and what it means for you.`,
    excerpt: `[MOCK] Everything you need to know about ${hook.toLowerCase()}, explained simply.`,
    readTimeMinutes: 4,
    targetKeywords: [hook.toLowerCase(), 'local service tips', 'how to'],
    contentMarkdown:
      `## ${hook}\n\n[MOCK] This ${mode === 'draft' ? 'polished draft' : 'post'} covers ${hook.toLowerCase()} from start to finish.\n\n{{media:after-intro}}\n\n## Why It Matters\n\n[MOCK] A closer look at why ${hook.toLowerCase()} is worth your attention.\n\n## Getting Started\n\n[MOCK] Practical next steps to act on this today.`,
    suggestedMediaPlacements: [
      { placementTag: 'after-intro', contextNote: '[MOCK] A relevant photo here helps ground the introduction.' },
    ],
    callToAction: '[MOCK] Ready to get started? Reach out to our team today.',
  };
}

export function validateBlogPostInput(body: any): string | null {
  if (!body || (body.mode !== 'notes' && body.mode !== 'draft')) {
    return "mode must be 'notes' or 'draft'";
  }
  const text = body.mode === 'notes' ? body.notes : body.draftCopy;
  if (typeof text !== 'string' || !text.trim()) {
    return body.mode === 'notes' ? 'notes is required' : 'draftCopy is required';
  }
  if (!BlogPostToneOptions.includes(body.tone)) {
    return `tone must be one of ${BlogPostToneOptions.join(', ')}`;
  }
  if (body.media !== undefined) {
    const validMedia =
      Array.isArray(body.media) &&
      body.media.every((m: any) => m && (m.type === 'image' || m.type === 'video') && typeof m.url === 'string' && m.url.trim());
    if (!validMedia) {
      return 'media must be an array of {type: "image"|"video", url: string, caption?: string, altText?: string}';
    }
  }
  return null;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add blog post package schema, prompt, mock, and validation"
```

---

### Task 4: Scoring integration — `BLOG_POST` in `creativeScore.ts`

**Files:**
- Modify: `src/lib/creativeScore.ts`

**Interfaces:**
- Produces: `'BLOG_POST'` added to `ScorableType` — consumed by Task 5 (`generate/route.ts`) and Task 10 (`ScoreBadge` usage in the panel).

- [ ] **Step 1: Add the type**

Change line 1 from:

```ts
export type ScorableType = 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'DRIP' | 'LANDING_PAGE';
```

to:

```ts
export type ScorableType = 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'DRIP' | 'LANDING_PAGE' | 'BLOG_POST';
```

- [ ] **Step 2: Add SEO-length constants**

Directly below the existing `const META_FOLD_LIMIT = 125;` line, add:

```ts
const BLOG_TITLE_MIN = 40;
const BLOG_TITLE_MAX = 65;
const BLOG_META_DESC_MIN = 110;
const BLOG_META_DESC_MAX = 165;
```

- [ ] **Step 3: Add the `BLOG_POST` case to `hookTextFor`**

Change:

```ts
function hookTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.headline || firstSentence(content);
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[0]?.line || firstSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.heroHeadline || firstSentence(content);
  return firstSentence(content);
}
```

to:

```ts
function hookTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.headline || firstSentence(content);
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[0]?.line || firstSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.heroHeadline || firstSentence(content);
  if (type === 'BLOG_POST') return metadata?.title || firstSentence(content);
  return firstSentence(content);
}
```

- [ ] **Step 4: Add the `BLOG_POST` case to `ctaTextFor`**

Change:

```ts
function ctaTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.cta || '';
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[metadata.beats.length - 1]?.line || lastSentence(content);
  if (type === 'DRIP') return metadata?.steps?.[metadata.steps.length - 1]?.content || lastSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.primaryCta || lastSentence(content);
  return lastSentence(content);
}
```

to:

```ts
function ctaTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.cta || '';
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[metadata.beats.length - 1]?.line || lastSentence(content);
  if (type === 'DRIP') return metadata?.steps?.[metadata.steps.length - 1]?.content || lastSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.primaryCta || lastSentence(content);
  if (type === 'BLOG_POST') return metadata?.callToAction || lastSentence(content);
  return lastSentence(content);
}
```

- [ ] **Step 5: Add the `BLOG_POST` case to `scoreCompliance`**

Change:

```ts
function scoreCompliance(type: ScorableType, content: string, metadata: any): { points: number; ok: boolean } {
  if (type === 'VIDEO_SCRIPT' || type === 'LANDING_PAGE') return { points: 25, ok: true };

  if (type === 'AD') {
```

to:

```ts
function scoreCompliance(type: ScorableType, content: string, metadata: any): { points: number; ok: boolean } {
  if (type === 'VIDEO_SCRIPT' || type === 'LANDING_PAGE') return { points: 25, ok: true };

  if (type === 'BLOG_POST') {
    const titleLen = (metadata?.title || '').length;
    const metaDescLen = (metadata?.metaDescription || '').length;
    const titleOk = titleLen >= BLOG_TITLE_MIN && titleLen <= BLOG_TITLE_MAX;
    const metaDescOk = metaDescLen >= BLOG_META_DESC_MIN && metaDescLen <= BLOG_META_DESC_MAX;
    if (titleOk && metaDescOk) return { points: 25, ok: true };
    if (titleOk || metaDescOk) return { points: 13, ok: false };
    return { points: 5, ok: false };
  }

  if (type === 'AD') {
```

- [ ] **Step 6: Make the compliance feedback message type-aware**

The generic message ("Trim content to fit platform limits (SMS 160 / Google headline 30 / Meta fold ~125)") is actively wrong for a blog post. Change:

```ts
  if (!compliance.ok) feedback.push('Trim content to fit platform limits (SMS 160 / Google headline 30 / Meta fold ~125).');
```

to:

```ts
  if (!compliance.ok) {
    feedback.push(
      type === 'BLOG_POST'
        ? 'Adjust title (~50-60 chars) and meta description (~120-160 chars) for better SEO display.'
        : 'Trim content to fit platform limits (SMS 160 / Google headline 30 / Meta fold ~125).',
    );
  }
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/creativeScore.ts
git commit -m "feat: add BLOG_POST scorable type with SEO-length compliance check"
```

---

### Task 5: `generate/route.ts` — allow `BLOG_POST` in refine mode

**Files:**
- Modify: `src/app/api/sandbox/generate/route.ts`

**Interfaces:**
- Consumes (from Task 4): `'BLOG_POST'` as a valid `ScorableType`.

- [ ] **Step 1: Add it to the allow-list**

Change:

```ts
const VALID_SCORABLE_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP', 'LANDING_PAGE'];
```

to:

```ts
const VALID_SCORABLE_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP', 'LANDING_PAGE', 'BLOG_POST'];
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sandbox/generate/route.ts
git commit -m "feat: allow BLOG_POST in the generic refine/auto-optimize route"
```

---

### Task 6: API layer — generation wrapper and route

**Files:**
- Create: `src/lib/blogPost.ts`
- Create: `src/app/api/sandbox/blog-post/route.ts`

**Interfaces:**
- Consumes (from Task 3): `BLOG_POST_PROMPT`, `callOpenAiJson`, `mockBlogPostPackage`, `BlogPostPackageSchema`, `type BlogPostPackage`, `type MediaAsset`, `type BrandDna`, `validateBlogPostInput` from `@/lib/sandboxPrompts`. Consumes (from Task 2): `type BlogPostTone`.
- Produces: `generateBlogPostPackage(mode: 'notes' | 'draft', text: string, tone: BlogPostTone, media: MediaAsset[], brandDna?: BrandDna): Promise<BlogPostPackage>` — consumed by the route in this task.

- [ ] **Step 1: Write the generation wrapper**

Create `src/lib/blogPost.ts`:

```ts
import {
  BLOG_POST_PROMPT,
  callOpenAiJson,
  mockBlogPostPackage,
  BlogPostPackageSchema,
  type BlogPostPackage,
  type MediaAsset,
  type BrandDna,
} from '@/lib/sandboxPrompts';
import type { BlogPostTone } from '@/components/sandbox/types';

export async function generateBlogPostPackage(
  mode: 'notes' | 'draft',
  text: string,
  tone: BlogPostTone,
  media: MediaAsset[],
  brandDna?: BrandDna,
): Promise<BlogPostPackage> {
  const userContext = [
    `Input mode: ${mode === 'notes' ? 'raw notes — write a full post from scratch' : 'existing draft — restructure, polish, and SEO-optimize without inventing new claims'}`,
    `Tone: ${tone}`,
    media.length
      ? `Available media (reference by placementTag in suggestedMediaPlacements — use only where it genuinely helps):\n${media.map((m, i) => `${i + 1}. [${m.type}] ${m.caption || '(no caption)'}`).join('\n')}`
      : 'No media provided.',
    mode === 'notes' ? 'Raw notes:' : 'Existing draft:',
    text,
  ].join('\n\n');

  return callOpenAiJson(BLOG_POST_PROMPT, userContext, () => mockBlogPostPackage(text, mode), 0.7, BlogPostPackageSchema, brandDna);
}
```

- [ ] **Step 2: Write the route**

Create `src/app/api/sandbox/blog-post/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { validateBlogPostInput } from '@/lib/sandboxPrompts';
import { generateBlogPostPackage } from '@/lib/blogPost';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateBlogPostInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const text = body.mode === 'notes' ? body.notes : body.draftCopy;
    const result = await generateBlogPostPackage(body.mode, text, body.tone, body.media || [], body.activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox blog-post error:', err);
    return NextResponse.json({ error: err.message || 'Blog post generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify the route with the dev server**

Run `npm run dev`, then:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/blog-post \
  -H "Content-Type: application/json" \
  -d '{"mode":"notes","notes":"We just finished a kitchen remodel for a client in Denver. Talk about the process, timeline (6 weeks), and how we handled a mid-project material shortage.","tone":"storytelling","media":[{"type":"image","url":"https://example.com/kitchen.jpg","caption":"Finished kitchen","altText":"Remodeled kitchen with white cabinets"}]}'
```

Expected: JSON with `"success": true`, non-empty `title`/`slug`/`metaDescription`/`contentMarkdown`, and a `suggestedMediaPlacements` array (or `[MOCK]`-prefixed fields if no LLM key is configured — expected, not a failure). Stop the dev server after checking, then follow the Global Constraints dev-server-hygiene note to revert any regenerated service-worker files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blogPost.ts src/app/api/sandbox/blog-post/route.ts
git commit -m "feat: add blog post generation API route"
```

---

### Task 7: Live-preview HTML renderer

**Files:**
- Create: `src/components/sandbox/blogPostHtml.ts`

**Interfaces:**
- Consumes (from Task 3, type-only): `type BlogPostPackage`, `type MediaAsset` from `@/lib/sandboxPrompts`. Consumes `marked` from the `marked` package (Task 1).
- Produces: `renderBlogPostHtml(pkg: BlogPostPackage, media: MediaAsset[], placementAssignments: Record<string, number | null>, brandColor?: string | null): string` — consumed by `BlogPostStudioPanel.tsx` (Task 11).

- [ ] **Step 1: Write the renderer**

Create `src/components/sandbox/blogPostHtml.ts`:

```ts
import { marked } from 'marked';
import type { BlogPostPackage, MediaAsset } from '@/lib/sandboxPrompts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mediaFigureHtml(media: MediaAsset): string {
  const caption = media.caption
    ? `<figcaption class="text-sm text-slate-500 mt-2 text-center">${escapeHtml(media.caption)}</figcaption>`
    : '';
  const body =
    media.type === 'video'
      ? `<video controls class="w-full rounded-lg" src="${escapeHtml(media.url)}"></video>`
      : `<img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.altText || media.caption || '')}" class="w-full rounded-lg object-cover" />`;
  return `<figure class="my-8">${body}${caption}</figure>`;
}

export function renderBlogPostHtml(
  pkg: BlogPostPackage,
  media: MediaAsset[],
  placementAssignments: Record<string, number | null>,
  brandColor?: string | null,
): string {
  const accent = brandColor && /^#[0-9a-fA-F]{3,8}$/.test(brandColor) ? brandColor : '#059669';

  let bodyHtml = marked.parse(pkg.contentMarkdown || '') as string;
  for (const placement of pkg.suggestedMediaPlacements) {
    const marker = `{{media:${placement.placementTag}}}`;
    const assignedIndex = placementAssignments[placement.placementTag];
    const assignedMedia = assignedIndex != null ? media[assignedIndex] : undefined;
    const replacement = assignedMedia ? mediaFigureHtml(assignedMedia) : '';
    // marked wraps a marker sitting on its own line in <p>…</p> — collapse
    // that wrapper too so the replacement figure isn't nested inside a <p>.
    const wrappedMarker = `<p>${marker}</p>`;
    bodyHtml = bodyHtml.includes(wrappedMarker)
      ? bodyHtml.replaceAll(wrappedMarker, replacement)
      : bodyHtml.replaceAll(marker, replacement);
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pkg.title || 'Blog Post Preview')}</title>
<meta name="description" content="${escapeHtml(pkg.metaDescription)}" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
  .article-body h2 { font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-top: 2rem; margin-bottom: 0.75rem; }
  .article-body h3 { font-size: 1.25rem; font-weight: 700; color: #0F172A; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  .article-body p { margin-bottom: 1rem; line-height: 1.75; color: #334155; }
  .article-body ul, .article-body ol { margin: 1rem 0 1rem 1.5rem; color: #334155; }
  .article-body li { margin-bottom: 0.375rem; }
  .article-body a { color: ${accent}; text-decoration: underline; }
  .article-body strong { font-weight: 700; color: #0F172A; }
  .article-body blockquote { border-left: 4px solid ${accent}; padding-left: 1rem; font-style: italic; color: #475569; margin: 1.5rem 0; }
</style>
</head>
<body class="bg-white font-sans">
  <article class="max-w-2xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-black text-slate-900 leading-tight">${escapeHtml(pkg.title)}</h1>
    <p class="mt-3 text-slate-500 text-sm">${pkg.readTimeMinutes} min read</p>
    <p class="mt-4 text-lg text-slate-600 italic">${escapeHtml(pkg.excerpt)}</p>
    <div class="article-body mt-10">${bodyHtml}</div>
    <a href="#" class="inline-block mt-10 px-6 py-3 rounded-lg text-white font-bold" style="background-color:${accent}">${escapeHtml(pkg.callToAction)}</a>
  </article>
</body>
</html>`;
}
```

(No Tailwind `prose`/typography-plugin dependency — the Tailwind CDN build doesn't include that plugin, so the `<style>` block above hand-styles the raw tags `marked` produces, the same self-contained-template approach `landingPageHtml.ts` already uses.)

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/blogPostHtml.ts
git commit -m "feat: add blog post live-preview HTML renderer"
```

---

### Task 8: BlogPostStudioPanel — shell, input controls, generation

**Files:**
- Create: `src/components/sandbox/BlogPostStudioPanel.tsx`

**Interfaces:**
- Consumes: `BlogPostToneOptions`, `type OrgBrand`, `type BlogPostTone` from `./types` (Task 2). `type BrandDna`, `type BlogPostPackage`, `type MediaAsset` from `@/lib/sandboxPrompts` (Task 3, type-only). `fetchJsonArray`, `fetchGenerationJson` from `@/lib/sandboxClientFetch`. `ActiveBrandDnaBadge` from `./ActiveBrandDnaBadge`.
- Produces: `BlogPostStudioPanel` default export, props `{ activeBrandDna?: BrandDna | null }` — consumed by the sandbox page (Task 13). Internal state `pkg: BlogPostPackage | null`, `media: MediaAsset[]`, `placementAssignments: Record<string, number | null>` — consumed by Tasks 9-12 in this same file.

- [ ] **Step 1: Write the panel shell**

Create `src/components/sandbox/BlogPostStudioPanel.tsx`:

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Sparkles, Plus, X, RefreshCw } from 'lucide-react';
import { BlogPostToneOptions, type OrgBrand, type BlogPostTone } from './types';
import type { BrandDna, BlogPostPackage, MediaAsset } from '@/lib/sandboxPrompts';
import { fetchJsonArray, fetchGenerationJson } from '@/lib/sandboxClientFetch';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';

type InputMode = 'notes' | 'draft';

const emptyMedia = (): MediaAsset => ({ type: 'image', url: '', caption: '', altText: '' });

export default function BlogPostStudioPanel({ activeBrandDna }: { activeBrandDna?: BrandDna | null } = {}) {
  const [mode, setMode] = useState<InputMode>('notes');
  const [text, setText] = useState('');
  const [tone, setTone] = useState<BlogPostTone>('informative');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [pkg, setPkg] = useState<BlogPostPackage | null>(null);
  const [placementAssignments, setPlacementAssignments] = useState<Record<string, number | null>>({});

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);

  const updateMedia = (index: number, patch: Partial<MediaAsset>) => {
    setMedia((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const addMedia = () => setMedia((prev) => [...prev, emptyMedia()]);

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
    setPlacementAssignments((prev) => {
      const next: Record<string, number | null> = {};
      for (const [tag, assigned] of Object.entries(prev)) {
        if (assigned === index) next[tag] = null;
        else if (assigned != null && assigned > index) next[tag] = assigned - 1;
        else next[tag] = assigned;
      }
      return next;
    });
  };

  const canGenerate = text.trim().length > 0 && !generating;

  const generate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    setGenerationFailed(false);
    try {
      const data = await fetchGenerationJson('/api/sandbox/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          [mode === 'notes' ? 'notes' : 'draftCopy']: text,
          tone,
          media,
          activeBrandDna: activeBrandDna || undefined,
        }),
      });
      const { success, ...rest } = data;
      setPkg(rest as BlogPostPackage);
      setPlacementAssignments({});
    } catch (err: any) {
      setGenerationFailed(true);
      toast.error(err.message || 'Failed to generate blog post');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6 items-start">
      {/* LEFT: Controls & Inspector */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Blog Post Studio
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('notes')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'notes' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Notes
            </button>
            <button
              onClick={() => setMode('draft')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'draft' ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              From Draft Copy
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">
            {mode === 'notes' ? 'Raw Notes' : 'Draft Copy'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={
              mode === 'notes'
                ? 'e.g. Kitchen remodel in Denver, 6-week timeline, handled a mid-project material shortage smoothly...'
                : 'Paste your existing draft here — I\'ll restructure, polish, and SEO-optimize it without changing your claims.'
            }
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Tone</label>
          <div className="flex flex-wrap gap-2">
            {BlogPostToneOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  tone === t
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Reference Media (optional)</label>
          <div className="space-y-2">
            {media.map((m, i) => (
              <div key={i} className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex gap-1.5">
                  <select
                    value={m.type}
                    onChange={(e) => updateMedia(i, { type: e.target.value as MediaAsset['type'] })}
                    className="bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input
                    value={m.url}
                    onChange={(e) => updateMedia(i, { url: e.target.value })}
                    placeholder="https://... media URL"
                    className="flex-1 bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                  />
                  <button onClick={() => removeMedia(i)} className="px-2 rounded-lg text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={m.caption}
                  onChange={(e) => updateMedia(i, { caption: e.target.value })}
                  placeholder="Caption (shown under the image/video)"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                />
                <input
                  value={m.altText}
                  onChange={(e) => updateMedia(i, { altText: e.target.value })}
                  placeholder="Alt text (accessibility/SEO)"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addMedia}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Media
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Client (for Brand DNA &amp; preview color)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            <option value="">No client selected (default tone)</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Blog Post'}
        </button>

        {/* Task 9 inserts the SEO inspector + media placement rows here */}
        {/* Task 10 inserts ScoreBadge + Save to Staged Assets here */}
        {/* Task 12 inserts the export row here */}
      </div>

      {/* RIGHT: Live Preview — Task 11 fills this in */}
      <div className="space-y-3">
        {!pkg && (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[500px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            {generationFailed ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
                <button
                  onClick={generate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : (
              'Add notes or a draft and Generate Blog Post to see the live preview here.'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. `selectedOrg` is computed but not yet read outside this file — expected at this point, Task 11 uses it for the preview accent color.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/BlogPostStudioPanel.tsx
git commit -m "feat: add blog post panel shell, input controls, and generation"
```

---

### Task 9: BlogPostStudioPanel — SEO inspector, section refine, media placements

**Files:**
- Modify: `src/components/sandbox/BlogPostStudioPanel.tsx`

**Interfaces:**
- Consumes: `/api/sandbox/landing-page/refine-section` (existing, generic endpoint — no changes needed there).

- [ ] **Step 1: Add refine state and the refine/keyword/field-update helpers**

Add this state declaration directly below `const [placementAssignments, setPlacementAssignments] = useState<Record<string, number | null>>({});`:

```tsx
  const [refiningField, setRefiningField] = useState<string | null>(null);
```

Add these functions directly above the `return (` line:

```tsx
  const updateField = (patch: Partial<BlogPostPackage>) => {
    setPkg((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateKeyword = (index: number, value: string) => {
    setPkg((prev) => {
      if (!prev) return prev;
      const targetKeywords = [...prev.targetKeywords];
      targetKeywords[index] = value;
      return { ...prev, targetKeywords };
    });
  };

  const addKeyword = () => setPkg((prev) => (prev ? { ...prev, targetKeywords: [...prev.targetKeywords, ''] } : prev));

  const removeKeyword = (index: number) => {
    setPkg((prev) => (prev ? { ...prev, targetKeywords: prev.targetKeywords.filter((_, i) => i !== index) } : prev));
  };

  const refineSection = async (field: 'title' | 'metaDescription' | 'excerpt', instruction: string) => {
    if (!pkg) return;
    setRefiningField(field);
    try {
      const data = await fetchGenerationJson('/api/sandbox/landing-page/refine-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, currentValue: pkg[field], instruction, organizationId: organizationId || undefined }),
      });
      updateField({ [field]: data.text } as Partial<BlogPostPackage>);
      toast.success('Section updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refine section');
    } finally {
      setRefiningField(null);
    }
  };

  const assignPlacement = (tag: string, mediaIndex: number | null) => {
    setPlacementAssignments((prev) => ({ ...prev, [tag]: mediaIndex }));
  };
```

- [ ] **Step 2: Insert the SEO inspector and media placement rows**

Replace this line:

```tsx
        {/* Task 9 inserts the SEO inspector + media placement rows here */}
```

with:

```tsx
        {pkg && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Title</label>
                <button
                  onClick={() => refineSection('title', 'Rewrite this title to be more compelling and keyword-aware, keep it 50-60 characters')}
                  disabled={refiningField === 'title'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'title' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <input
                value={pkg.title}
                onChange={(e) => updateField({ title: e.target.value })}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
              <p className="text-[9px] text-slate-400">{pkg.title.length} chars (aim for 50-60)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Slug</label>
              <input
                value={pkg.slug}
                onChange={(e) => updateField({ slug: e.target.value })}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Meta Description</label>
                <button
                  onClick={() => refineSection('metaDescription', 'Rewrite this meta description to be 120-160 characters and include the primary keyword naturally')}
                  disabled={refiningField === 'metaDescription'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'metaDescription' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <textarea
                value={pkg.metaDescription}
                onChange={(e) => updateField({ metaDescription: e.target.value })}
                rows={2}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
              <p className="text-[9px] text-slate-400">{pkg.metaDescription.length} chars (aim for 120-160)</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Excerpt</label>
                <button
                  onClick={() => refineSection('excerpt', 'Rewrite this excerpt to hook a reader in one or two sentences')}
                  disabled={refiningField === 'excerpt'}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60 flex items-center gap-1"
                >
                  {refiningField === 'excerpt' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Rewrite
                </button>
              </div>
              <textarea
                value={pkg.excerpt}
                onChange={(e) => updateField({ excerpt: e.target.value })}
                rows={2}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Target Keywords</label>
              {pkg.targetKeywords.map((kw, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={kw}
                    onChange={(e) => updateKeyword(i, e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                  <button onClick={() => removeKeyword(i)} className="px-2 rounded-lg text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addKeyword}
                className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Keyword
              </button>
            </div>

            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
              {pkg.readTimeMinutes} min read
            </span>

            {pkg.suggestedMediaPlacements.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Media Placements</label>
                {pkg.suggestedMediaPlacements.map((placement) => (
                  <div key={placement.placementTag} className="space-y-1 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{placement.contextNote}</p>
                    <select
                      value={placementAssignments[placement.placementTag] ?? ''}
                      onChange={(e) => assignPlacement(placement.placementTag, e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white"
                    >
                      <option value="">(none)</option>
                      {media.map((m, i) => (
                        <option key={i} value={i}>{m.caption || `${m.type} ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sandbox/BlogPostStudioPanel.tsx
git commit -m "feat: add blog post SEO inspector, section refine, and media placement assignment"
```

---

### Task 10: BlogPostStudioPanel — ScoreBadge and Save to Staged Assets

**Files:**
- Modify: `src/components/sandbox/BlogPostStudioPanel.tsx`

**Interfaces:**
- Consumes: `ScoreBadge` from `./ScoreBadge` (existing, unmodified — its generic `AssetDraftSchema` refine round-trip already works for any `ScorableType` including the new `'BLOG_POST'` from Task 4).

- [ ] **Step 1: Import `ScoreBadge` and add the save-state**

Add to the imports:

```tsx
import ScoreBadge from './ScoreBadge';
import { Save } from 'lucide-react';
```

(merge `Save` into the existing `lucide-react` import line rather than a separate import statement)

Add this state directly below `const [refiningField, setRefiningField] = useState<string | null>(null);`:

```tsx
  const [saving, setSaving] = useState(false);
```

- [ ] **Step 2: Add the save function**

Add directly above the `return (` line:

```tsx
  const saveToStaged = async () => {
    if (!pkg) return;
    setSaving(true);
    try {
      const { contentMarkdown, ...metadata } = pkg;
      const res = await fetch('/api/sandbox/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pkg.title, type: 'BLOG_POST', content: contentMarkdown, metadata }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Saved to Staged Assets');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Insert the ScoreBadge and save button**

Replace:

```tsx
        {/* Task 10 inserts ScoreBadge + Save to Staged Assets here */}
```

with:

```tsx
        {pkg && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <ScoreBadge
              content={pkg.contentMarkdown}
              type="BLOG_POST"
              metadata={pkg}
              onOptimized={(r) =>
                setPkg((prev) =>
                  prev ? { ...prev, title: r.title || prev.title, contentMarkdown: r.content, ...(r.metadata || {}) } : prev,
                )
              }
            />
            <button
              onClick={saveToStaged}
              disabled={saving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save to Staged Assets'}
            </button>
          </div>
        )}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/BlogPostStudioPanel.tsx
git commit -m "feat: add blog post ScoreBadge critique loop and staged-asset save"
```

---

### Task 11: BlogPostStudioPanel — live preview pane

**Files:**
- Modify: `src/components/sandbox/BlogPostStudioPanel.tsx`

**Interfaces:**
- Consumes (from Task 7): `renderBlogPostHtml` from `./blogPostHtml`.

- [ ] **Step 1: Import the renderer and compute the preview**

Add to the imports:

```tsx
import { renderBlogPostHtml } from './blogPostHtml';
```

Add directly below `const selectedOrg = orgs.find((o) => o.id === organizationId);`:

```tsx
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const previewHtml = useMemo(
    () => (pkg ? renderBlogPostHtml(pkg, media, placementAssignments, selectedOrg?.primaryColor) : ''),
    [pkg, media, placementAssignments, selectedOrg?.primaryColor],
  );
  const viewportWidth = viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';
```

- [ ] **Step 2: Replace the placeholder right pane**

Replace the entire `{/* RIGHT: Live Preview — Task 11 fills this in */}` block (from `<div className="space-y-3">` through its matching closing `</div>`) with:

```tsx
      {/* RIGHT: Live Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {(['mobile', 'tablet', 'desktop'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                viewport === v
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {v === 'mobile' ? 'Mobile 375px' : v === 'tablet' ? 'Tablet 768px' : 'Desktop 100%'}
            </button>
          ))}
        </div>
        <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-4 min-h-[500px] flex items-center justify-center overflow-auto">
          {pkg ? (
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              title="Blog post preview"
              style={{ width: viewportWidth, height: '800px', border: 'none', background: 'white' }}
              className="rounded-lg shadow-lg shrink-0"
            />
          ) : generationFailed ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">Generation failed. This can happen during high demand.</p>
              <button
                onClick={generate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
              Add notes or a draft and Generate Blog Post to see the live preview here.
            </div>
          )}
        </div>
      </div>
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sandbox/BlogPostStudioPanel.tsx
git commit -m "feat: wire blog post live preview pane"
```

---

### Task 12: BlogPostStudioPanel — export row (HTML/Markdown/JSON/WordPress)

**Files:**
- Modify: `src/components/sandbox/BlogPostStudioPanel.tsx`

- [ ] **Step 1: Add export imports and state**

Merge into the existing `lucide-react` import line: add `Download`, `FileCode`, `FileJson`, `Globe`.

Add this state directly below `const [saving, setSaving] = useState(false);`:

```tsx
  const [pushingWp, setPushingWp] = useState(false);
```

- [ ] **Step 2: Add the export/download/WordPress functions**

Add directly above the `return (` line:

```tsx
  const slugify = (value: string) => (value || 'blog-post').replace(/\s+/g, '-').toLowerCase();

  const downloadTextFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = async () => {
    if (!pkg) return;
    try {
      await navigator.clipboard.writeText(previewHtml);
      toast.success('Copied HTML to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadHtml = () => pkg && downloadTextFile(`${slugify(pkg.slug || pkg.title)}.html`, previewHtml, 'text/html');
  const downloadMarkdown = () => pkg && downloadTextFile(`${slugify(pkg.slug || pkg.title)}.md`, pkg.contentMarkdown, 'text/markdown');
  const downloadJson = () => pkg && downloadTextFile(`${slugify(pkg.slug || pkg.title)}.json`, JSON.stringify(pkg, null, 2), 'application/json');

  const pushToWordpress = async () => {
    if (!pkg) return;
    if (!organizationId) {
      toast.error('Select a client organization first');
      return;
    }
    setPushingWp(true);
    try {
      const credsRes = await fetch(`/api/organizations/credentials?organizationId=${organizationId}`);
      const creds = await credsRes.json();
      if (!creds.wordpressUrl || !creds.wordpressUsername || !creds.wordpressAppPass) {
        throw new Error('Missing WordPress credentials in API Vault for this client');
      }
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wpUrl: creds.wordpressUrl,
          wpUsername: creds.wordpressUsername,
          wpAppPassword: creds.wordpressAppPass,
          title: pkg.title,
          content: previewHtml,
          postType: 'posts',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish to WordPress');
      toast.success('Draft post created on WordPress');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to WordPress');
    } finally {
      setPushingWp(false);
    }
  };
```

- [ ] **Step 3: Insert the export row**

Replace:

```tsx
        {/* Task 12 inserts the export row here */}
```

with:

```tsx
        {pkg && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={copyHtml}
              className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide"
            >
              Copy HTML
            </button>
            <button
              onClick={downloadHtml}
              className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              <FileCode className="w-3 h-3" /> Download HTML
            </button>
            <button
              onClick={downloadMarkdown}
              className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Download Markdown
            </button>
            <button
              onClick={downloadJson}
              className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              <FileJson className="w-3 h-3" /> Download JSON
            </button>
            <button
              onClick={pushToWordpress}
              disabled={pushingWp}
              className="col-span-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              {pushingWp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
              Push to WordPress
            </button>
          </div>
        )}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/BlogPostStudioPanel.tsx
git commit -m "feat: add blog post HTML/Markdown/JSON export and WordPress push"
```

---

### Task 13: Page wiring

**Files:**
- Modify: `src/app/(sandbox)/sandbox/page.tsx`

**Interfaces:**
- Consumes: `BlogPostStudioPanel` default export from `./BlogPostStudioPanel` (Tasks 8-12). Consumes (from Task 2): `'blog-post'` as a valid `SandboxTool`.

- [ ] **Step 1: Add the import**

Change the lucide-react import line from:

```tsx
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop, Fingerprint, Calendar, ShieldCheck, Mail } from 'lucide-react';
```

to:

```tsx
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop, Fingerprint, Calendar, ShieldCheck, Mail, FileText } from 'lucide-react';
```

Add this import below the `DirectMailPanel` import:

```tsx
import BlogPostStudioPanel from '@/components/sandbox/BlogPostStudioPanel';
```

- [ ] **Step 2: Add the tab**

Add to the `TABS` array, after the `direct-mail` entry:

```ts
  { id: 'blog-post', label: 'Blog Post Studio', icon: FileText },
```

- [ ] **Step 3: Add the render block**

Add after the `direct-mail` render block:

```tsx
          {activeTool === 'blog-post' && <BlogPostStudioPanel activeBrandDna={activeBrandDna} />}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(sandbox)/sandbox/page.tsx"
git commit -m "feat: add blog post studio tab to sandbox page"
```

---

### Task 14: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build completes with no errors, `/api/sandbox/blog-post` and `/sandbox` both appear in the route listing output. Pay particular attention to any `Module not found: Can't resolve 'fs'/'net'/'tls'/'dns'` error — that specific failure means a runtime (non-type-only) import from `sandboxPrompts.ts` leaked into `BlogPostStudioPanel.tsx`'s client bundle (see Global Constraints); fix by moving the offending value into `types.ts` the same way `FormFactorOptions`/`BlogPostToneOptions` were handled.

- [ ] **Step 2: Revert any dev-server artifacts**

Run: `git status --short` — if `public/sw.js` or any `public/workbox-*.js` appear modified/untracked (from any `npm run dev` used during manual checks earlier), revert/remove them per the Global Constraints dev-server-hygiene note before the final commit.

- [ ] **Step 3: Manual end-to-end check (document the gap if blocked)**

Attempt: `npm run dev`, navigate to `/sandbox`, click **Blog Post Studio**, generate from notes, assign a media placement, use a "Rewrite" button, check the live preview updates, save to staged assets, try each export button. As established on Direct Mail Studio, this is expected to be blocked in this environment (no browser automation tool, `/sandbox` is auth-gated). Report the same gap rather than silently skipping verification.

---

## Self-Review Notes

- **Spec coverage:** Data layer (Task 3) → scoring/refine integration (Tasks 4-5) → API layer (Task 6) → preview renderer (Task 7) → panel shell/controls/generation (Task 8) → SEO inspector/refine/media placements (Task 9) → ScoreBadge/staging (Task 10) → live preview (Task 11) → export/WordPress (Task 12) → page wiring (Task 13) → build verification (Task 14). Every section of the design spec (`docs/superpowers/specs/2026-08-05-blog-post-studio-design.md`) maps to a task.
- **Client-bundle rule applied from the start:** `BlogPostToneOptions` goes in `types.ts` (Task 2), not `sandboxPrompts.ts` — avoiding the exact bug hit and fixed during Direct Mail Studio's implementation. `MediaAsset`/`BlogPostPackage` stay in `sandboxPrompts.ts` since the panel only needs them as type-only imports (erased at compile time, safe regardless of source module).
- **Type consistency:** `BlogPostPackage`/`MediaAsset`/`BlogPostTone` names match exactly across Tasks 3, 6, 7, and 8-12 — no renaming drift. `placementAssignments: Record<string, number | null>` is declared once (Task 8) and consumed identically by Task 9 (assignment UI), Task 11 (`renderBlogPostHtml` call). `refineSection`'s `field` parameter type (`'title' | 'metaDescription' | 'excerpt'`) matches the three call sites added in Task 9.
- **Placeholder scan:** every step has real, complete code — no "add error handling" or "similar to Task N" placeholders. The three `{/* Task N inserts ... */}` JSX comments in Task 8 are intentional, explicit hand-off markers between tasks in the same file (not vague TODOs) and are each replaced with real code by name in a specific later task.
