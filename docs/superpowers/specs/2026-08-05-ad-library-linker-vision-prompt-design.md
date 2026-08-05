# Ad Library Linker & Vision-to-Prompt Image Analysis Design

**Goal:** Two additions to the Brand Identity dashboard: (1) quick-link buttons to Meta/Google/TikTok ad-transparency tools for the mined domain, (2) a per-image "Analyze Midjourney Prompt" action that turns a mined brand image into a detailed Midjourney/FLUX-style text prompt via vision LLM.

**Non-goals:** No new SSRF/URL validation beyond what `analyze-swipe`'s existing vision route already does (presence-check only) — the image URLs here come from `identity.brandImages`, already resolved during mining, not freely pasted by the user. No persistence of generated prompts (component state only, same lifetime as the rest of the mined `identity`).

## Architecture

### 1. Ad Library Linker — `BrandIdentityPanel.tsx` only, no lib changes

Pure client-side. Domain derived from the already-held `url` state: `new URL(url).hostname.replace(/^www\./, '')`. New "Active Ad Libraries & Spy Links" section (placed near the existing Ad Strategy Breakdown), three `<a target="_blank" rel="noopener noreferrer">` buttons using the task's exact URL templates:

- Meta: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&q={domain}`
- Google: `https://adstransparency.google.com/?region=anywhere&q={domain}`
- TikTok: `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=30&region=US` (domain-agnostic per the task's own URL — no `q=` param on this one, implemented verbatim, not invented)

### 2. Vision helper — `sandboxPrompts.ts` (prompt/schema/mock) + `brandExtractor.ts` (orchestration)

Same split already established for `extractBrandFromUrl`/`BRAND_IDENTITY_EXTRACT_PROMPT`. In `sandboxPrompts.ts`:

```ts
export const ImagePromptSchema = z.object({ prompt: z.string().catch('') });

export const IMAGE_PROMPT_VISION_PROMPT =
  'You are an expert Midjourney/FLUX prompt engineer. Look at this image and write one detailed, single-paragraph ' +
  'text-to-image prompt that would recreate its composition, subject, lighting, mood, and color palette. ' +
  'End the prompt with style parameters: --ar 16:9 --style raw. ' +
  'Return a valid JSON object matching this structure exactly: {"prompt": "the full generated prompt text"}.';

export function mockImagePrompt(): { prompt: string } {
  return { prompt: '[MOCK — set OPENAI_API_KEY for real output] A product hero shot, soft studio lighting, clean neutral background, confident brand tone, warm color palette --ar 16:9 --style raw' };
}
```

In `brandExtractor.ts`:

```ts
export async function generateMidjourneyPromptFromImage(imageUrl: string): Promise<string> {
  const result = await callOpenAiVisionJson(IMAGE_PROMPT_VISION_PROMPT, imageUrl, () => mockImagePrompt(), 0.7, ImagePromptSchema);
  return result.prompt;
}
```

### 3. Route — `src/app/api/sandbox/image-prompt/route.ts` (new)

Mirrors `analyze-swipe`'s `analyze` action exactly:

```ts
export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    const prompt = await generateMidjourneyPromptFromImage(imageUrl);
    return NextResponse.json({ success: true, prompt });
  } catch (err: any) {
    console.error('Sandbox image-prompt error:', err);
    return NextResponse.json({ error: err.message || 'Prompt generation failed' }, { status: 500 });
  }
}
```

### 4. UI — `BrandIdentityPanel.tsx` (extend)

- New state: `analyzingImage: string | null` (which image URL is in flight), `imagePrompts: Record<string, string>` (url → generated prompt, accumulates as the user analyzes more images).
- Each Visuals grid thumbnail gains a hover-revealed "Analyze" overlay button (`group-hover`, same affordance as the existing `CopyButton` overlay pattern) alongside its existing open-in-new-tab click — the button calls `/api/sandbox/image-prompt`, shows a small spinner while `analyzingImage === imgUrl`, and stores the result in `imagePrompts` on success (`toast.error` on failure, matching every other panel's async-action pattern).
- New "Midjourney Prompts" section below the Visuals grid, rendered when `Object.keys(imagePrompts).length > 0`: one quote-card per entry, same styling as the Key Verbal Tracks cards, each with the existing `CopyButton` reused as-is.

## Error handling

Route: 400 for missing `imageUrl`, 500 for anything else (matches `analyze-swipe`). `callOpenAiVisionJson` already degrades to `mockImagePrompt()` when no provider key is set and never throws on malformed model output (schema `.catch()` defaults). Component: fetch failures surface via `toast.error`, `analyzingImage` resets in a `finally` block.

## Testing

- `npx tsc --noEmit` — zero errors.
- Manual: mine a real brand, confirm the 3 ad-library links open the correct URLs for that domain; click "Analyze" on a thumbnail with no LLM provider key set, confirm a `[MOCK]`-prefixed prompt appears in the new list with a working Copy button.
