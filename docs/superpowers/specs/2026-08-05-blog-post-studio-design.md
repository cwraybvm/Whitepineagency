# Blog Post Studio — Design

## Goal

Add a "Blog Post Studio" tool to the AI Creative Sandbox that turns raw notes or a pasted draft — plus an optional list of reference media (image/video URLs) — into a fully structured, SEO-optimized blog post (title, slug, meta description, excerpt, target keywords, markdown body, suggested media placements, CTA) with a live visual preview, per-field AI refinement, staged-asset saving with the existing quality-score/critique loop, and multi-format export (HTML, Markdown, JSON, WordPress).

## Data layer (`src/lib/sandboxPrompts.ts`)

Schemas as specified by the request, verbatim:

```ts
export const BlogPostToneOptions = ['informative', 'storytelling', 'thought_leadership', 'promotional'] as const;
export type BlogPostTone = (typeof BlogPostToneOptions)[number];

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
```

`MediaAssetSchema` is the shape of the **input** media list the user pastes (URL + caption + alt text) — it is not nested inside `BlogPostPackageSchema`. The AI's *output* only references media abstractly via `suggestedMediaPlacements` (a `placementTag` + a human-readable `contextNote` describing what should go there, e.g. `{placementTag: "after-intro", contextNote: "Show the team photo here to build trust after establishing the problem."}`). The UI is what connects a specific pasted media item to a specific placement (see Components below) — the model never needs to know real URLs to suggest good placement.

`BLOG_POST_PROMPT`:
- Given an input mode (`notes` or `draft`), a tone, a numbered list of available media (type + caption only, no URLs — the model doesn't need them), and the raw text.
- If mode is `notes`: write a complete, original, SEO-structured post from scratch based on the notes.
- If mode is `draft`: restructure, polish, and SEO-optimize the existing draft — preserve the author's voice, claims, and facts; do not invent new content, only improve structure/clarity/SEO framing.
- `contentMarkdown` must be well-formed Markdown (headings, paragraphs, lists as appropriate) and must include inline placement markers in the exact form `{{media:<placementTag>}}` at the points in the body where `suggestedMediaPlacements` entries should render — one marker per suggested placement, tags matching 1:1.
- `targetKeywords`: 3-6 realistic SEO keywords/phrases inferred from the topic.
- `metaDescription`: 120-160 characters, includes the primary keyword naturally.
- `title`: 50-60 characters where possible, compelling and keyword-aware.
- Output must match `BlogPostPackageSchema` exactly.

`mockBlogPostPackage(text: string, mode: 'notes' | 'draft'): BlogPostPackage` — `[MOCK]`-prefixed, same convention as every other sandbox tool (`mockDirectMailPackage`, `mockLandingPage`, etc.), used only when no LLM provider succeeds.

`validateBlogPostInput(body: any): string | null`:
- `mode` must be `'notes'` or `'draft'`
- the corresponding text field (`notes` when mode is `'notes'`, `draftCopy` when mode is `'draft'`) required, non-empty string
- `tone` must be one of `BlogPostToneOptions`
- `media` (if present) must be an array where every entry has `type` in `['image','video']` and a non-empty `url`; `caption`/`altText` optional strings

## API layer

`src/lib/blogPost.ts` — thin wrapper, mirrors `masterCampaign.ts`/`directMail.ts`:

```ts
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
      ? `Available media (reference by placementTag in suggestedMediaPlacements, one marker per item is not required — use only where it genuinely helps):\n${media.map((m, i) => `${i + 1}. [${m.type}] ${m.caption || '(no caption)'}`).join('\n')}`
      : 'No media provided.',
    mode === 'notes' ? 'Raw notes:' : 'Existing draft:',
    text,
  ].join('\n\n');

  return callOpenAiJson(BLOG_POST_PROMPT, userContext, () => mockBlogPostPackage(text, mode), 0.7, BlogPostPackageSchema, brandDna);
}
```

`src/app/api/sandbox/blog-post/route.ts` — thin route, validates + delegates, identical shape to `direct-mail/route.ts`:

```ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateBlogPostInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const text = body.mode === 'notes' ? body.notes : body.draftCopy;
    const result = await generateBlogPostPackage(body.mode, text, body.tone, body.media || [], body.activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox blog-post error:', err);
    return NextResponse.json({ error: err.message || 'Blog post generation failed' }, { status: 500 });
  }
}
```

## Scoring & refine integration

Three small, contained edits, following the existing `LANDING_PAGE` precedent exactly:

1. **`src/lib/creativeScore.ts`**: add `'BLOG_POST'` to `ScorableType`. In `hookTextFor`: `if (type === 'BLOG_POST') return metadata?.title || firstSentence(content);`. In `ctaTextFor`: `if (type === 'BLOG_POST') return metadata?.callToAction || lastSentence(content);`. In `scoreCompliance`: add a case scoring `metadata?.title` length (~50-60 chars) and `metadata?.metaDescription` length (~120-160 chars) — same two-tier point shape as the existing `AD` headline/body-length check (25 if both in range, 13 if one, 5 if neither).
2. **`src/lib/sandboxPrompts.ts`**: `basePromptForType` gets `if (type === 'BLOG_POST') return BLOG_POST_PROMPT;`.
3. **`src/app/api/sandbox/generate/route.ts`**: add `'BLOG_POST'` to `VALID_SCORABLE_TYPES`.

`ScoreBadge` is used exactly as `LandingPageStudioPanel` uses it — `content={pkg.contentMarkdown}`, `type="BLOG_POST"`, `metadata={rest of pkg}` — its generic refine round-trip (`AssetDraftSchema`: title/content/metadata) needs no schema changes; `onOptimized` maps the result back onto local state the same way Landing Page's `normalizeMetadata` does.

**Section refine** reuses `/api/sandbox/landing-page/refine-section` as-is — it is already generic (`field`/`currentValue`/`instruction`/`organizationId`), not landing-page-specific despite its route path. Blog Post Studio calls it for `title` ("rewrite this title to be more compelling, keep it 50-60 characters"), `metaDescription` ("rewrite this meta description to be 120-160 characters and include the primary keyword naturally"), and `excerpt` ("rewrite this excerpt to hook a reader in one or two sentences").

## Components

`src/components/sandbox/blogPostHtml.ts` — pure render function, same shape as `landingPageHtml.ts`:

```ts
export function renderBlogPostHtml(
  pkg: BlogPostPackage,
  media: MediaAsset[],
  placementAssignments: Record<string, number | null>,
  brandColor?: string | null,
): string
```

Uses `marked` (new dependency — small, zero-dependency, standard Markdown-to-HTML parser) to convert `contentMarkdown` to HTML, then replaces each `{{media:<placementTag>}}` marker with a `<figure>` block (`<img>` for `type: 'image'`, `<video controls>` for `type: 'video'`, with the assigned item's `caption`/`altText`) for whichever media the user assigned to that slot, or strips the marker entirely if unassigned. Same `escapeHtml` helper and Tailwind-CDN-in-`<head>` preview template as `landingPageHtml.ts`, so the result drops directly into the same `<iframe srcDoc={...} sandbox="allow-scripts">` + mobile/tablet/desktop viewport-toggle preview pattern, reused verbatim from `LandingPageStudioPanel`.

`src/components/sandbox/BlogPostStudioPanel.tsx` — orchestrator, following `LandingPageStudioPanel`'s structure closely:

- **Input mode toggle**: "From Notes" / "From Draft Copy" — a single textarea whose placeholder/label changes with the mode (same two-mode toggle pattern as Landing Page's brief/asset toggle, but text/text instead of text/staged-asset).
- **Tone select**: `BlogPostToneOptions` as a row of toggle buttons.
- **Media list editor**: paste URL + type (image/video) + caption + alt text per row, add/remove — same interaction shape as Direct Mail Studio's editable audience list.
- **Org dropdown**: drives `activeBrandDna` (tone, passed as a prop from the sandbox page like every sibling panel) is separate from this dropdown's `primaryColor`/`logoUrl` (preview accent only, client-side, same split established for Direct Mail Studio and Ad Builder).
- **Generate button** → `POST /api/sandbox/blog-post` with `{ mode, notes|draftCopy, tone, media, activeBrandDna }`.
- **SEO inspector** (left column, once generated): `title` (input + Rewrite button), `slug` (input, hand-editable, no auto-derivation from title), `metaDescription` (textarea + Rewrite button), `excerpt` (textarea + Rewrite button), `targetKeywords` (editable chip list — add/remove like the audience list pattern), `readTimeMinutes` (read-only badge, trusts the model's number).
- **Media placement rows**: one per `suggestedMediaPlacements` entry — shows the AI's `contextNote` as read-only guidance, plus a `<select>` of the user's pasted media (by caption) to assign to that `placementTag`, defaulting to "(none)". Assignment lives in local component state (`Record<placementTag, mediaIndex | null>`) and feeds `renderBlogPostHtml` for the live preview and all HTML-based exports.
- **`ScoreBadge`** (`type="BLOG_POST"`, `content={pkg.contentMarkdown}`, `metadata={rest of pkg}`) with `onOptimized` wired the same way Landing Page's is.
- **Save to Staged Assets**: `POST /api/sandbox/assets` with `{ title: pkg.title, type: 'BLOG_POST', content: pkg.contentMarkdown, metadata: rest of pkg }`.
- **Right pane**: viewport toggle (mobile/tablet/desktop) + live `<iframe>` preview via `renderBlogPostHtml`, identical mechanics to Landing Page Studio's preview pane.
- **Export row**: Copy HTML, Download HTML (`.html`), Download Markdown (raw `contentMarkdown`, `.md`), Download JSON (full package, `.json`), Push to WordPress (reuses `/api/wordpress` exactly as Landing Page Studio's `pushToWordpress` does, with `postType: 'posts'` instead of `'pages'` — same credential-check/error-handling flow, same API Vault lookup via `/api/organizations/credentials`).

## Page wiring

- `src/components/sandbox/types.ts`: add `'blog-post'` to `SandboxTool`.
- `src/app/(sandbox)/sandbox/page.tsx`: add a tab (`FileText` icon from `lucide-react`), render `<BlogPostStudioPanel activeBrandDna={activeBrandDna} />` in the draft view slot.
- `package.json`: add `marked` as a dependency.

## Error handling

Same shape as every sibling route: 400 for validation failures, 500 with `err.message` for generation failures, toasted client-side via `sonner`. The WordPress push button reuses `LandingPageStudioPanel.pushToWordpress`'s exact try/catch/credential-check flow (missing-credentials error surfaced as a toast, not a silent failure).

## Testing

No automated test framework exists for sandbox tools in this repo (confirmed again on the Direct Mail Studio build — no `test` script in `package.json`, no sibling panel has tests). Verification is `npx tsc --noEmit` and `npm run build`. A full interactive manual pass (generate → assign media placements → live preview → refine a field → save to staged → export each format → push to WordPress) is the intended verification but is blocked in this environment the same way it was for Direct Mail Studio: no browser automation tool (`chromium-cli`/Playwright) is available, and `/sandbox` is auth-gated so `curl` can't reach it either. That gap will be flagged again at completion rather than silently skipped.
