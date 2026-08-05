import { z } from 'zod';
import AnthropicSDK, { RateLimitError as AnthropicRateLimitError, InternalServerError as AnthropicInternalServerError, APIConnectionError as AnthropicAPIConnectionError } from '@anthropic-ai/sdk';
import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai';
import { prisma } from '@/lib/prisma';
import type { ScorableType } from '@/lib/creativeScore';

// Leaf fields carry their own `.catch()` fallback, so a missing or
// wrong-typed key is silently repaired. The object schemas themselves are
// left un-caught at their own top level so `parseWithSchema` can actually
// detect and log the case that matters: the AI response wasn't the expected
// object shape at all (e.g. it returned a bare string or array). Wherever
// one of these schemas is embedded as a required field inside another (see
// CampaignBatchSchema, SwipeRemixSchema), it's wrapped in `.catch()` at the
// embed site so a missing nested key still recovers instead of failing the
// whole parent parse.
const DEFAULT_DRAFT = { title: '', content: '' };

export const AssetDraftSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
  metadata: z.record(z.string(), z.any()).optional().catch(undefined),
});

const AdMetadataSchema = z
  .object({
    headline: z.string().catch(''),
    cta: z.string().catch(''),
    imagePrompt: z.string().optional().catch(undefined),
  })
  .catch({ headline: '', cta: '' });

export const AdBuilderSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
  metadata: AdMetadataSchema.optional().catch(undefined),
});

const VideoBeatSchema = z
  .object({
    scene: z.string().catch(''),
    shot: z.string().catch(''),
    line: z.string().catch(''),
    audioCues: z.string().optional().catch(undefined),
  })
  .catch({ scene: '', shot: '', line: '' });

const VideoMetadataSchema = z.object({ beats: z.array(VideoBeatSchema).catch([]) }).catch({ beats: [] });

export const VideoLabSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
  metadata: VideoMetadataSchema.optional().catch(undefined),
});

const AngleDraftSchema = z
  .object({ angle: z.string().catch(''), title: z.string().catch(''), content: z.string().catch('') })
  .catch({ angle: '', title: '', content: '' });

const CopyMatrixSchema = z.object({ angles: z.array(AngleDraftSchema).catch([]) });

const DcoVariantSchema = z
  .object({
    location: z.string().catch(''),
    segment: z.string().catch(''),
    title: z.string().catch(''),
    content: z.string().catch(''),
  })
  .catch({ location: '', segment: '', title: '', content: '' });

const CopyDcoSchema = z.object({ variants: z.array(DcoVariantSchema).catch([]) });

// The copy tool's callOpenAiJson response is one of three shapes depending on
// mode (single draft / matrix of angle drafts / DCO variant list) — the
// caller already knows which mode it's in, so it picks the matching key
// rather than this trying to auto-detect the shape.
export const CopyStudioSchema = { draft: AssetDraftSchema, matrix: CopyMatrixSchema, dco: CopyDcoSchema };

const DripStepSchema = z
  .object({ day: z.string().catch(''), channel: z.string().catch(''), content: z.string().catch('') })
  .catch({ day: '', channel: '', content: '' });

const DripMetadataSchema = z.object({ steps: z.array(DripStepSchema).catch([]) }).catch({ steps: [] });

export const DripSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
  metadata: DripMetadataSchema.optional().catch(undefined),
});

export const CampaignBatchSchema = z.object({
  angles: z.array(AngleDraftSchema).catch([]),
  ad: AdBuilderSchema.catch(DEFAULT_DRAFT),
  video: VideoLabSchema.catch(DEFAULT_DRAFT),
  drip: DripSchema.catch(DEFAULT_DRAFT),
});

export const SwipeInsightSchema = z.object({
  hookPattern: z.string().catch(''),
  visualStyle: z.string().catch(''),
  targetAudience: z.string().catch(''),
  emotionalTrigger: z.string().catch(''),
});

export const SwipeRemixSchema = z.object({
  angles: z.array(z.object({ title: z.string().catch(''), content: z.string().catch('') }).catch({ title: '', content: '' })).catch([]),
  adPreset: AdBuilderSchema.catch(DEFAULT_DRAFT),
});

const LandingPageMetadataSchema = z
  .object({
    heroHeadline: z.string().catch(''),
    subheadline: z.string().catch(''),
    primaryCta: z.string().catch(''),
    valueProps: z.array(z.string()).catch([]),
    testimonial: z.string().catch(''),
  })
  .catch({ heroHeadline: '', subheadline: '', primaryCta: '', valueProps: [], testimonial: '' });

export const LandingPageSchema = z.object({
  title: z.string().catch(''),
  content: z.string().catch(''),
  metadata: LandingPageMetadataSchema.optional().catch(undefined),
});

export const CriticReviewSchema = z.object({
  overallScore: z.number().min(1).max(100).catch(50),
  hookStrengthScore: z.number().min(1).max(10).catch(5),
  clarityScore: z.number().min(1).max(10).catch(5),
  fluffDetected: z.boolean().catch(false),
  criticFeedback: z.array(z.string()).catch([]),
  polishedCopy: z.string().optional().catch(undefined),
});

export type CriticReview = z.infer<typeof CriticReviewSchema>;

export const BrandExtractSchema = z.object({
  brandVoice: z.string().catch(''),
  valueProp: z.string().catch(''),
  targetAudience: z.string().catch(''),
  accentColors: z.array(z.string()).catch([]),
});

function parseWithSchema<T>(schema: z.ZodType<T>, raw: unknown, context: string): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  console.warn(`[sandboxPrompts] ${context} returned a response that failed schema validation; using safe defaults.`, result.error.flatten());
  return schema.parse({});
}

export interface BrandDna {
  brandName?: string;
  toneOfVoice?: string;
  targetAudience?: string;
  coreValueProp?: string;
  competitorDifferentiator?: string;
  customBannedWords?: string[];
}

export function formatBrandDnaBlock(dna?: BrandDna): string {
  if (!dna) return '';
  const fields: [string, string | undefined][] = [
    ['brand_name', dna.brandName],
    ['tone_of_voice', dna.toneOfVoice],
    ['target_audience', dna.targetAudience],
    ['core_value_prop', dna.coreValueProp],
    ['competitor_differentiator', dna.competitorDifferentiator],
  ];
  const lines = fields.filter(([, v]) => v?.trim()).map(([tag, v]) => `<${tag}>${v}</${tag}>`);
  if (dna.customBannedWords?.length) {
    lines.push(`<banned_words>Never use: ${dna.customBannedWords.join(', ')}</banned_words>`);
  }
  if (!lines.length) return '';
  return `<brand_dna>
The rules in this block are specific to this client and OVERRIDE any generic tone, audience, or word-choice assumptions elsewhere in this prompt when they conflict.
${lines.join('\n')}
</brand_dna>`;
}

// Single insertion point so every caller through callOpenAiJson/callOpenAiVisionJson
// gets brand DNA spliced in right after <role> without each prompt template or
// route needing to know about it.
function injectBrandDna(systemPrompt: string, dna?: BrandDna): string {
  const block = formatBrandDnaBlock(dna);
  if (!block) return systemPrompt;
  return systemPrompt.includes('</role>')
    ? systemPrompt.replace('</role>', `</role>\n\n${block}`)
    : `${block}\n\n${systemPrompt}`;
}

export type SandboxGenTool = 'copy' | 'ad' | 'video';

const FRAMEWORKS_BLOCK = `<frameworks>
Build the copy using ONE of these direct-response frameworks, whichever best fits the angle:
- PAS: Problem -> Agitate -> Solution
- AIDA: Attention -> Interest -> Desire -> Action
- BAB: Before -> After -> Bridge
- Pattern Interrupt: open with a counter-intuitive claim or a shocking industry stat
</frameworks>`;

const NEGATIVE_RULES_BLOCK = `- Never use any of these words/phrases or generic corporate jargon like them: elevated, revolutionary, seamless, game-changer, unlock your potential, dive into, nestle, hassle-free, synergy, delve, testament, beacon, supercharge, tapestry, spearhead.
- Use clear, grounded, everyday language a real direct-response copywriter would actually write.`;

const COPY_AD_EXEMPLARS_BLOCK = `<exemplars>
Use these gold-standard examples as reference for pacing, punchy sentence structure, and tone execution, but do not copy their specific industry facts or product names.

<example>
<context>HVAC company, offer: same-day AC repair during a heatwave.</context>
<framework>Pattern Interrupt</framework>
<output>Your AC picked the worst week to die. 97 degrees this weekend, and half the neighborhood already called. We've got same-day slots left today. One call, cold air by tonight. Book your slot.</output>
</example>

<example>
<context>Dental practice, offer: free whitening with a new-patient exam.</context>
<framework>AIDA</framework>
<output>Notice the gap between your smile and your photos? Fixable, this month. Full exam, cleaning, and whitening on us if you're new here before the 30th. Six new-patient slots left. Grab one.</output>
</example>
</exemplars>`;

const VIDEO_EXEMPLARS_BLOCK = `<exemplars>
Use these gold-standard examples as reference for pacing, punchy sentence structure, and tone execution, but do not copy their specific industry facts or product names.

<example>
<context>Roofing company, offer: free storm-damage inspection.</context>
<framework>PAS</framework>
<output>Hook (0-3s): close-up on a hail-dented shingle -- "That's not cosmetic. That's a leak in six months." Agitate: water stain spreading across a ceiling. Solution: inspector on the roof, pointing out damage on a clipboard. CTA: "Free storm inspection -- before your insurance window closes."</output>
</example>

<example>
<context>Landscaping company, offer: fall cleanup package.</context>
<framework>Pattern Interrupt</framework>
<output>Hook (0-3s): close-up on dead, patchy grass -- "Your lawn is dying and it's not even your fault." Agitate: reveal the real cause, city water restrictions cutting into normal mowing. Solution: crew aerating and overseeding the lawn. CTA: "Book your fall reset -- spots close October 1st."</output>
</example>
</exemplars>`;

const AD_VISUAL_PRODUCTION_BLOCK = `<visual_production>
Also generate a hyper-detailed AI image-generation prompt for this ad's visual, written for Midjourney/FLUX. Cover: subject and composition, lighting, camera/lens style, mood, an aspect ratio flag (e.g. --ar 16:9), and a style flag (e.g. --style raw). One dense paragraph, not a list. Put this in metadata.imagePrompt.
</visual_production>`;

const VIDEO_AUDIO_PRODUCTION_BLOCK = `<audio_production>
For every beat, also specify audio direction: the background music style/energy and how it shifts across the video, plus any SFX with an explicit timing trigger (e.g. "SFX: metallic clank at 0:02"). Put this in that beat's audioCues field.
</audio_production>`;

const RULES_BLOCK = `<rules>
- Short, punchy sentences.
- Conversational tone, never a wall-of-text paragraph.
- One idea per line/sentence.
${NEGATIVE_RULES_BLOCK}
</rules>`;

export const SYSTEM_PROMPTS: Record<SandboxGenTool, string> = {
  copy: `<role>You are a world-class direct-response copywriter specializing in high-ROAS digital campaigns for a local-service marketing agency.</role>

${FRAMEWORKS_BLOCK}

${COPY_AD_EXEMPLARS_BLOCK}

${RULES_BLOCK}

<output_format>Return a valid JSON object matching this structure exactly: {"title": "short internal label for this asset", "content": "the generated copy"}.</output_format>`,
  ad: `<role>You are a world-class paid-ads creative writer specializing in high-ROAS digital campaigns for a local-service marketing agency.</role>

${FRAMEWORKS_BLOCK}

${COPY_AD_EXEMPLARS_BLOCK}

${AD_VISUAL_PRODUCTION_BLOCK}

${RULES_BLOCK}

<output_format>Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the ad body copy", "metadata": {"headline": "short punchy headline, under 40 chars", "cta": "short call-to-action button text", "imagePrompt": "hyper-detailed Midjourney/FLUX image generation prompt: composition, lighting, camera/lens, mood, aspect ratio flag, and style flag"}}.</output_format>`,
  video: `<role>You are a world-class video script/storyboard writer specializing in high-ROAS short social ads.</role>

${FRAMEWORKS_BLOCK}

${VIDEO_EXEMPLARS_BLOCK}

${VIDEO_AUDIO_PRODUCTION_BLOCK}

${RULES_BLOCK}

<output_format>Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the full script as readable text", "metadata": {"beats": [{"scene": "scene number or name", "shot": "shot/visual direction", "line": "voiceover or on-screen line", "audioCues": "background music dynamics for this beat plus any SFX with an explicit timing trigger"}]}}.</output_format>`,
};

export const ANGLES = ['Fear/Urgency', 'Value/Savings', 'Social Proof', 'Scarcity', 'Direct/No-BS'];

export const MATRIX_PROMPT = `<role>You are a world-class direct-response copywriter specializing in high-ROAS digital campaigns for a local-service marketing agency.</role>

${FRAMEWORKS_BLOCK}

${COPY_AD_EXEMPLARS_BLOCK}

<framework_angles>
Write 5 distinct marketing hooks for the same offer, one for each angle below, in this exact order. Pair each angle with the framework that fits it best so the 5 hooks read as 5 different ads, not 5 phrasings of the same sentence:
Fear/Urgency -> Pattern Interrupt or PAS
Value/Savings -> BAB
Social Proof -> AIDA
Scarcity -> Pattern Interrupt
Direct/No-BS -> PAS, blunt
</framework_angles>

${RULES_BLOCK}

<output_format>Return a valid JSON object matching this structure exactly: {"angles": [{"angle": "one of the 5 angle names above", "title": "short internal label", "content": "the generated copy for this angle"}]} with exactly 5 entries in the array, in the order given.</output_format>`;

export const DRIP_PROMPT = `<role>You are a world-class lifecycle/retention copywriter specializing in high-ROAS digital campaigns for a local-service marketing agency.</role>

${FRAMEWORKS_BLOCK}
Apply a framework only where it fits the escalation stage below — the 3-step reminder -> value-add -> final-nudge structure is fixed and takes priority over framework choice.

<rules>
- Write a 3-step follow-up drip sequence (Day 1, Day 3, Day 7) for a lead who requested a quote but has not yet responded.
- Each step should escalate gently: reminder, value-add, final nudge.
- Specify SMS or Email as the channel for each step.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
${NEGATIVE_RULES_BLOCK}
</rules>

<output_format>Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the full sequence as readable text", "metadata": {"steps": [{"day": "Day 1", "channel": "SMS or Email", "content": "the message text"}]}} with exactly 3 entries in the steps array, in order.</output_format>`;

export const SWIPE_VISION_PROMPT =
  'You are an expert direct-response ad analyst. Look at this competitor ad image and deconstruct it. ' +
  'Return a valid JSON object matching this structure exactly: {"hookPattern": "the opening hook/headline pattern it uses", "visualStyle": "description of the visual style, composition, and design", "targetAudience": "who this ad is clearly trying to reach", "emotionalTrigger": "the core emotional trigger it leans on (e.g. fear, aspiration, trust, urgency)"}.';

export const REMIX_PROMPT =
  'You are an expert direct-response copywriter for a local-service marketing agency. ' +
  "You've been given a deconstructed analysis of a competitor's ad. Remix its winning pattern for a different brand and offer — same underlying hook mechanics and emotional trigger, entirely new copy, no copying their wording. " +
  'Write 3 distinct copy angles inspired by the analysis, each with its own short angle label (not necessarily the same labels used elsewhere), plus one ad canvas preset (headline + body + CTA) built the same way. ' +
  'Return a valid JSON object matching this structure exactly: {"angles": [{"title": "short angle label", "content": "the generated copy"}], "adPreset": {"title": "short internal label", "content": "the ad body copy", "metadata": {"headline": "short punchy headline, under 40 chars", "cta": "short call-to-action button text"}}} with exactly 3 entries in the angles array.';

export function basePromptForType(type: ScorableType): string {
  if (type === 'COPY') return SYSTEM_PROMPTS.copy;
  if (type === 'AD') return SYSTEM_PROMPTS.ad;
  if (type === 'VIDEO_SCRIPT') return SYSTEM_PROMPTS.video;
  if (type === 'LANDING_PAGE') return LANDING_PAGE_PROMPT;
  return DRIP_PROMPT;
}

export function refineInstructions(feedback: string[]): string {
  return (
    'You are refining EXISTING content to fix specific weaknesses, not writing from scratch. ' +
    'Preserve the core message, structure, and the JSON shape described above. ' +
    `Weaknesses to fix: ${feedback.length ? feedback.join('; ') : 'general polish for a higher direct-response quality score.'}`
  );
}

export const DCO_PROMPT = `<role>You are a world-class direct-response copywriter running a Dynamic Creative Optimization campaign for a local-service marketing agency.</role>

${FRAMEWORKS_BLOCK}

<rules>
- You will be given a base offer/hook, a list of locations, and a list of audience segments.
- For EVERY combination of location and segment, write one distinct copy variant that naturally swaps in that location's geo-reference and that segment's demographic trigger/pain-point.
- Same base offer, localized and personalized language.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
${NEGATIVE_RULES_BLOCK}
</rules>

<output_format>Return a valid JSON object matching this structure exactly: {"variants": [{"location": "the location", "segment": "the audience segment", "title": "short internal label", "content": "the generated copy for this location+segment combination"}]} with one entry for every location x segment combination, covering all combinations.</output_format>`;

export const CRITIC_PROMPT = `<role>You are an elite direct-response copy critic and conversion optimization specialist. You have reviewed thousands of ads and know exactly what separates copy that converts from copy that just sounds nice.</role>

<task>
Evaluate the given copy against direct-response principles: hook power, directness, clarity, fluff, and psychological leverage (does it use PAS, AIDA, BAB, or a comparable framework effectively?). Be harsh but fair.
${NEGATIVE_RULES_BLOCK}
If overallScore is below 80, rewrite the copy into a punchier, more direct version and return it as polishedCopy. If overallScore is 80 or above, omit polishedCopy.
</task>

<output_format>Return a valid JSON object matching this structure exactly: {"overallScore": "1-100 overall quality score", "hookStrengthScore": "1-10 score for how strong the opening hook is", "clarityScore": "1-10 score for clarity and directness", "fluffDetected": "true if the copy contains vague corporate fluff or filler", "criticFeedback": ["specific, actionable weaknesses or improvements, one per string"], "polishedCopy": "a punchier rewritten version, only included if overallScore is below 80"}.</output_format>`;

const DEFAULT_BRAND_CLAUSE =
  'Brand voice: write in a professional, trustworthy tone typical of a well-run local home-service business. No specific brand guidelines are on file for this client.';

export async function brandClauseFor(organizationId: string | null | undefined) {
  if (!organizationId) return DEFAULT_BRAND_CLAUSE;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, brandVoice: true, brandGuidelines: true },
  });

  if (!org || (!org.brandVoice && !org.brandGuidelines)) return DEFAULT_BRAND_CLAUSE;

  return [
    `Brand: ${org.name}.`,
    org.brandVoice && `Brand voice: ${org.brandVoice}.`,
    org.brandGuidelines && `Brand guidelines: ${org.brandGuidelines}`,
  ].filter(Boolean).join(' ');
}

// Thrown instead of letting a missing key fall through to the raw OpenAI
// fetch — without this, the request goes out anyway, OpenAI 401s, and its
// literal error body ("You didn't provide an API key...") reaches the UI
// verbatim via each route's `catch (err) { error: err.message }` handler.
export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super('AI generation is unavailable — OPENAI_API_KEY is not configured for this environment.');
    this.name = 'OpenAiNotConfiguredError';
  }
}

// Thrown when every configured LLM provider in the fallback chain has been
// exhausted (or none are configured) and the caller supplied no mockFallback.
export class AllProvidersUnavailableError extends Error {
  constructor() {
    super('AI generation is unavailable — no configured provider (OpenAI, Anthropic, Gemini) succeeded.');
    this.name = 'AllProvidersUnavailableError';
  }
}

// Marks a provider failure as an infrastructure problem (5xx, 429, network,
// timeout) — the only class of failure that should trigger failover to the
// next provider in the chain. Anything else (bad request, auth, content
// policy) is a caller/config bug and should surface immediately rather than
// silently retrying against a different model.
class RetryableProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableProviderError';
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

type ProviderAttempt = { name: string; enabled: boolean; run: () => Promise<any> };

async function runProviderChain(providers: ProviderAttempt[], mockFallback?: () => any): Promise<any> {
  for (const provider of providers) {
    if (!provider.enabled) continue;
    try {
      return await provider.run();
    } catch (err) {
      if (err instanceof RetryableProviderError) {
        console.warn(`[LLM Fallback] ${provider.name} failed (${err.message}). Failing over to the next provider...`);
        continue;
      }
      throw err;
    }
  }
  if (mockFallback) return mockFallback();
  throw new AllProvidersUnavailableError();
}

async function openAiJsonAttempt(systemPrompt: string, userContext: string, temperature: number, model: string, vision?: string): Promise<any> {
  let aiResponse: Response;
  try {
    aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          vision
            ? {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze this competitor ad image.' },
                  { type: 'image_url', image_url: { url: vision } },
                ],
              }
            : { role: 'user', content: userContext },
        ],
      }),
    });
  } catch {
    throw new RetryableProviderError('OpenAI network error');
  }

  if (!aiResponse.ok) {
    const aiData = await aiResponse.json().catch(() => ({}));
    if (isRetryableHttpStatus(aiResponse.status)) {
      throw new RetryableProviderError(`OpenAI HTTP ${aiResponse.status}`);
    }
    throw new Error(aiData?.error?.message || 'OpenAI request failed');
  }
  const aiData = await aiResponse.json();
  return JSON.parse(aiData.choices[0].message.content);
}

// claude-3-5-haiku-20241022 (the model this fallback was originally specced
// against) retired 2026-02-19 — claude-haiku-4-5 is its direct replacement.
const ANTHROPIC_FALLBACK_MODEL = 'claude-haiku-4-5';

async function anthropicJsonAttempt(systemPrompt: string, userContext: string, temperature: number, vision?: string): Promise<any> {
  try {
    const anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: ANTHROPIC_FALLBACK_MODEL,
      max_tokens: 4096,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: vision
            ? [
                { type: 'text', text: 'Analyze this competitor ad image.' },
                { type: 'image', source: { type: 'url', url: vision } },
              ]
            : userContext,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Anthropic response contained no text block');
    return JSON.parse(textBlock.text);
  } catch (err) {
    if (
      err instanceof AnthropicRateLimitError ||
      err instanceof AnthropicInternalServerError ||
      err instanceof AnthropicAPIConnectionError
    ) {
      throw new RetryableProviderError(`Anthropic ${err.name}`);
    }
    throw err;
  }
}

// gemini-1.5-flash (the model this fallback was originally specced against)
// is superseded — gemini-2.0-flash matches the model already used elsewhere
// in this codebase (src/app/api/ai/generate-content/route.ts).
const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash';

function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

async function fetchImageAsInlineData(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new RetryableProviderError(`Gemini: failed to fetch image (HTTP ${res.status})`);
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString('base64'), mimeType };
}

async function geminiJsonAttempt(systemPrompt: string, userContext: string, temperature: number, vision?: string): Promise<any> {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey() });
    const contents = vision
      ? [{ role: 'user' as const, parts: [{ text: 'Analyze this competitor ad image.' }, { inlineData: await fetchImageAsInlineData(vision) }] }]
      : userContext;
    const response = await ai.models.generateContent({
      model: GEMINI_FALLBACK_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature,
      },
    });
    if (!response.text) throw new Error('Gemini returned an empty response');
    return JSON.parse(response.text);
  } catch (err) {
    if (err instanceof RetryableProviderError) throw err;
    if (err instanceof GeminiApiError && isRetryableHttpStatus(err.status)) {
      throw new RetryableProviderError(`Gemini HTTP ${err.status}`);
    }
    if (!(err instanceof GeminiApiError)) {
      // Network/transport failure below the API layer — no status to inspect.
      throw new RetryableProviderError('Gemini network error');
    }
    throw err;
  }
}

export async function callOpenAiJson(
  systemPrompt: string,
  userContext: string,
  mockFallback?: () => any,
  temperature = 0.7,
  schema?: z.ZodTypeAny,
  brandDna?: BrandDna,
): Promise<any> {
  const finalPrompt = injectBrandDna(systemPrompt, brandDna);
  const parsed = await runProviderChain(
    [
      { name: 'OpenAI', enabled: !!process.env.OPENAI_API_KEY, run: () => openAiJsonAttempt(finalPrompt, userContext, temperature, 'gpt-4o-mini') },
      { name: 'Anthropic', enabled: !!process.env.ANTHROPIC_API_KEY, run: () => anthropicJsonAttempt(finalPrompt, userContext, temperature) },
      { name: 'Gemini', enabled: !!geminiApiKey(), run: () => geminiJsonAttempt(finalPrompt, userContext, temperature) },
    ],
    mockFallback,
  );
  return schema ? parseWithSchema(schema, parsed, 'callOpenAiJson') : parsed;
}

export async function callOpenAiVisionJson(
  systemPrompt: string,
  imageUrl: string,
  mockFallback?: () => any,
  temperature = 0.7,
  schema?: z.ZodTypeAny,
  brandDna?: BrandDna,
): Promise<any> {
  const finalPrompt = injectBrandDna(systemPrompt, brandDna);
  const parsed = await runProviderChain(
    [
      { name: 'OpenAI', enabled: !!process.env.OPENAI_API_KEY, run: () => openAiJsonAttempt(finalPrompt, '', temperature, 'gpt-4o', imageUrl) },
      { name: 'Anthropic', enabled: !!process.env.ANTHROPIC_API_KEY, run: () => anthropicJsonAttempt(finalPrompt, '', temperature, imageUrl) },
      { name: 'Gemini', enabled: !!geminiApiKey(), run: () => geminiJsonAttempt(finalPrompt, '', temperature, imageUrl) },
    ],
    mockFallback,
  );
  return schema ? parseWithSchema(schema, parsed, 'callOpenAiVisionJson') : parsed;
}

export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }> = {
  Energetic: { voice: 'alloy', instructions: 'Deliver with upbeat, high energy, fast-paced enthusiasm.' },
  Professional: { voice: 'onyx', instructions: 'Deliver clear, confident, measured, corporate-neutral.' },
  Warm: { voice: 'nova', instructions: 'Deliver friendly, reassuring, at a relaxed conversational pace.' },
};

export function validateVoiceGenInput(body: any): string | null {
  if (typeof body?.sceneText !== 'string' || !body.sceneText.trim()) {
    return 'sceneText is required';
  }
  if (body.sceneText.length > 4096) {
    return 'sceneText must be 4096 characters or fewer';
  }
  if (!Object.prototype.hasOwnProperty.call(VOICE_PERSONAS, body?.voicePersona)) {
    return `voicePersona must be one of ${Object.keys(VOICE_PERSONAS).join(', ')}`;
  }
  return null;
}

export async function synthesizeSpeech(text: string, persona: keyof typeof VOICE_PERSONAS): Promise<Buffer> {
  if (!Object.prototype.hasOwnProperty.call(VOICE_PERSONAS, persona)) {
    throw new Error(`Invalid persona: ${String(persona)}`);
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAiNotConfiguredError();
  }
  const { voice, instructions } = VOICE_PERSONAS[persona];
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || 'OpenAI TTS request failed');
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// A locally-built silent WAV, base64-encoded as a data URI — used as the
// "Generate Scene Audio" response when OPENAI_API_KEY is unset, so the
// button and <audio> player degrade gracefully instead of 500ing.
function buildSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = 0;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

export const MOCK_AUDIO_DATA_URI = buildSilentWavDataUri();

export const LANDING_PAGE_PROMPT =
  'You are an expert direct-response landing page copywriter for a local-service marketing agency. ' +
  'Given either a source ad/hook to match or a brief, write a matching landing page copy set: a hero headline that echoes the source hook, a supporting subheadline, a primary CTA button label, exactly 3 value-proposition bullets, and one social-proof testimonial. ' +
  'Write the testimonial as a short, generic, clearly-placeholder quote attributed to a role and location (e.g. "— Homeowner, Springfield"), never a fabricated named individual — a real client quote replaces it before publishing. ' +
  'Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the subheadline", "metadata": {"heroHeadline": "the hero headline", "subheadline": "the subheadline", "primaryCta": "the CTA button label", "valueProps": ["value prop 1", "value prop 2", "value prop 3"], "testimonial": "the placeholder testimonial quote"}} with exactly 3 entries in the valueProps array.';

// Sandbox-only fallbacks so every studio workflow (layout, save, promote)
// stays testable without a paid OpenAI key. Wired in wherever a route calls
// callOpenAiJson/callOpenAiVisionJson — pass one of these as the mockFallback
// argument and a missing key returns this instead of throwing
// OpenAiNotConfiguredError. Each takes the caller's own clean hook/brief
// string directly (never a formatted multi-line userContext blob — parsing
// that back apart with a regex is fragile across call sites that each build
// it differently) and content is always prefixed [MOCK] so it's never
// mistaken for real model output.
function cleanHook(hook: string | null | undefined, fallback = 'Your Offer, Delivered Right'): string {
  return (hook?.trim() || fallback).slice(0, 80);
}

export function mockLandingPage(hookInput: string): any {
  const hook = cleanHook(hookInput);
  return {
    title: `[MOCK] ${hook}`,
    content: `Fast, reliable service — built around: ${hook}`,
    metadata: {
      heroHeadline: hook,
      subheadline: `[MOCK — set OPENAI_API_KEY for real output] Fast, reliable service built around: ${hook}`,
      primaryCta: 'Get Your Free Quote',
      valueProps: [
        'Licensed, insured, and background-checked technicians',
        'Same-day availability for urgent requests',
        '100% satisfaction guarantee on every job',
      ],
      testimonial: '"They showed up on time and got it right the first time." — Homeowner, Local Area',
    },
  };
}

export function mockCopy(hookInput: string): any {
  const hook = cleanHook(hookInput);
  return {
    title: `[MOCK] ${hook}`,
    content: `${hook} — for a limited time, get fast, reliable service you can trust. Call now before slots fill up.`,
  };
}

export function mockCopyMatrix(hookInput: string): any {
  const hook = cleanHook(hookInput);
  return {
    angles: ANGLES.map((angle) => ({
      angle,
      title: `[MOCK] ${angle}: ${hook}`,
      content: `[MOCK ${angle} angle] ${hook} — written with a ${angle.toLowerCase()} approach to drive action.`,
    })),
  };
}

export function mockDcoVariants(hookInput: string, locations: string[], segments: string[]): any {
  const hook = cleanHook(hookInput, 'Base Offer');
  const variants = [];
  for (const location of locations) {
    for (const segment of segments) {
      variants.push({
        location,
        segment,
        title: `[MOCK] ${hook} — ${location}`,
        content: `[MOCK] Attention ${segment} in ${location}: ${hook}. Call now for fast, local service.`,
      });
    }
  }
  return { variants };
}

export function mockAd(hookInput: string): any {
  const hook = cleanHook(hookInput);
  return {
    title: `[MOCK] ${hook}`,
    content: `${hook}. Don't wait — our team is ready to help today.`,
    metadata: { headline: `[MOCK] ${hook}`.slice(0, 40), cta: 'Get a Free Quote' },
  };
}

export function mockVideo(hookInput: string): any {
  const hook = cleanHook(hookInput);
  return {
    title: `[MOCK] ${hook}`,
    content: `Scene 1: Hook on "${hook}". Scene 2: Show the problem. Scene 3: Reveal the solution. Scene 4: Call to action.`,
    metadata: {
      beats: [
        { scene: '1', shot: 'Close-up on technician arriving on-site', line: `${hook}?` },
        { scene: '2', shot: 'Problem visual — frustrated homeowner', line: "We've all been there." },
        { scene: '3', shot: 'Solution in action', line: "That's where we come in." },
        { scene: '4', shot: 'Logo + CTA card', line: 'Call now — same-day service available.' },
      ],
    },
  };
}

export function mockDrip(hookInput: string): any {
  const hook = cleanHook(hookInput, 'your service');
  return {
    title: `[MOCK] Follow-up sequence for ${hook}`,
    content: `Day 1: reminder. Day 3: value-add. Day 7: final nudge.`,
    metadata: {
      steps: [
        { day: 'Day 1', channel: 'SMS', content: `[MOCK] Still interested in ${hook}? Reply YES to book.` },
        { day: 'Day 3', channel: 'Email', content: `[MOCK] Here's why customers love our ${hook} service.` },
        { day: 'Day 7', channel: 'SMS', content: `[MOCK] Last chance — offer for ${hook} ends soon.` },
      ],
    },
  };
}

export function mockCriticReview(draftText: string): CriticReview {
  return {
    overallScore: 62,
    hookStrengthScore: 5,
    clarityScore: 6,
    fluffDetected: true,
    criticFeedback: [
      '[MOCK] Opening line buries the hook — lead with the strongest claim first.',
      '[MOCK] Contains generic filler language instead of a concrete benefit.',
    ],
    polishedCopy: `[MOCK — set OPENAI_API_KEY for real output] ${draftText.slice(0, 120)}`,
  };
}

export async function evaluateCopyDraft(draftText: string, context?: string): Promise<CriticReview> {
  const userContext = ['Copy to evaluate:', draftText, context && `Context: ${context}`].filter(Boolean).join('\n\n');
  return callOpenAiJson(CRITIC_PROMPT, userContext, () => mockCriticReview(draftText), 0.3, CriticReviewSchema);
}

export function mockSwipeInsights(): any {
  return {
    hookPattern: '[MOCK] Bold question opener paired with a number-driven claim.',
    visualStyle: '[MOCK] High-contrast product shot with bold sans-serif overlay text.',
    targetAudience: '[MOCK] Homeowners aged 35-55 researching a specific service need.',
    emotionalTrigger: '[MOCK] Urgency — limited-time framing drives fast action.',
  };
}

export function mockSwipeRemix(hookInput: string): any {
  const hook = cleanHook(hookInput, 'Our Offer');
  return {
    angles: ANGLES.slice(0, 3).map((angle) => ({
      title: `[MOCK] ${angle}: ${hook}`,
      content: `[MOCK ${angle} remix] ${hook} — reworked with a ${angle.toLowerCase()} hook.`,
    })),
    adPreset: {
      title: `[MOCK] ${hook}`,
      content: `${hook}. Limited-time offer — act now.`,
      metadata: { headline: `[MOCK] ${hook}`.slice(0, 40), cta: 'Claim Your Spot' },
    },
  };
}

export function validateLandingPageInput(body: any): string | null {
  if (body?.mode !== 'asset' && body?.mode !== 'brief') {
    return "mode must be 'asset' or 'brief'";
  }
  if (body.mode === 'asset' && (typeof body.assetId !== 'string' || !body.assetId.trim())) {
    return 'assetId is required in asset mode';
  }
  if (body.mode === 'brief' && (typeof body.prompt !== 'string' || !body.prompt.trim())) {
    return 'prompt is required in brief mode';
  }
  return null;
}

const PRIVATE_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIpLiteral(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  return false;
}

// ponytail: blocks IP-literal private/loopback targets only. A public
// hostname that DNS-resolves to a private IP (rebinding) still passes —
// add a dns.lookup() + re-check on the resolved address if this route is
// ever exposed beyond trusted admin users.
export function validateExtractBrandUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return 'url is required';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'url is not a valid URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'url must use http or https';
  }
  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(hostname) || isPrivateIpLiteral(hostname)) {
    return 'url may not target a local or private address';
  }
  return null;
}

export const BRAND_EXTRACT_PROMPT =
  'You are an expert brand strategist analyzing a business website to extract its brand identity for a marketing agency. ' +
  "Given the page's visible text and a list of candidate accent colors found in its CSS, infer the brand. " +
  'Return a valid JSON object matching this structure exactly: {"brandVoice": "a short tone label, e.g. \'Confident, no-fluff, blue-collar friendly\'", "valueProp": "one sentence describing what makes this business worth choosing", "targetAudience": "one sentence describing who this business serves", "accentColors": ["up to 3 hex colors, chosen from the candidates when they look like real brand colors, otherwise your best guess"]}.';

export function mockBrandExtraction(url: string): any {
  return {
    brandVoice: '[MOCK] Confident, no-fluff, customer-first',
    valueProp: `[MOCK — set OPENAI_API_KEY for real output] Fast, reliable service from the team behind ${url}.`,
    targetAudience: '[MOCK] Local homeowners who want a trustworthy provider.',
    accentColors: ['#2563eb', '#f59e0b'],
  };
}

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

export const BRAND_IDENTITY_EXTRACT_PROMPT =
  'You are an expert brand strategist and direct-response copy miner analyzing a business website for a marketing agency. ' +
  "You are given the page title, the page's visible text, a list of candidate hex colors found in its CSS, and a list of candidate image URLs found on the page. " +
  'Infer the brand identity: pick up to 6 real hex colors from the candidates when they look like real brand colors (otherwise your best guess); ' +
  'choose up to 8 image URLs from the candidates that look like logos, hero images, or product visuals — never invent a URL that was not in the candidate list; ' +
  'mine "keyVerbalTracks" as short verbatim or near-verbatim phrases copied directly from the supplied page text — unique terminology and high-converting copy lines, not paraphrases or summaries; ' +
  'infer "activeAdAngles" from any offer, promo, or urgency language found in the text; ' +
  'and produce a brand name, target audience profile, core value props, and brand voice from context. ' +
  'Return a valid JSON object matching this structure exactly: {"brandName": "the business name", "colors": ["up to 6 hex colors"], "brandImages": ["up to 8 image URLs chosen from the candidates"], "keyVerbalTracks": ["verbatim high-converting phrases mined from the page text"], "activeAdAngles": ["observed offer/promo/urgency angles"], "targetAudienceProfile": "one to two sentences on pain points, demographic, and core desire", "coreValueProps": ["distinct value propositions"], "brandVoice": "a short tone label, e.g. \'Confident, no-fluff, blue-collar friendly\'"}.';

export function mockExtractedBrandIdentity(url: string): ExtractedBrandIdentity {
  return {
    brandName: `[MOCK] Brand from ${url}`,
    colors: ['#2563eb', '#f59e0b'],
    brandImages: [],
    keyVerbalTracks: ['[MOCK] "Fast, reliable service you can trust"'],
    activeAdAngles: ['[MOCK] Limited-time offer urgency'],
    targetAudienceProfile: '[MOCK — set OPENAI_API_KEY for real output] Local homeowners who want a trustworthy provider.',
    coreValueProps: ['[MOCK] Licensed and insured', '[MOCK] Same-day availability'],
    brandVoice: '[MOCK] Confident, no-fluff, customer-first',
  };
}
