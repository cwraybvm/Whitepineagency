import { prisma } from '@/lib/prisma';
import type { ScorableType } from '@/lib/creativeScore';

export type SandboxGenTool = 'copy' | 'ad' | 'video';

export const SYSTEM_PROMPTS: Record<SandboxGenTool, string> = {
  copy: 'You are an expert direct-response copywriter for a local-service marketing agency. Write copy in the requested tone. Return a valid JSON object matching this structure exactly: {"title": "short internal label for this asset", "content": "the generated copy"}.',
  ad: 'You are an expert paid-ads creative writer for a local-service marketing agency. Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the ad body copy", "metadata": {"headline": "short punchy headline, under 40 chars", "cta": "short call-to-action button text"}}.',
  video: 'You are an expert video script/storyboard writer for short social ads. Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the full script as readable text", "metadata": {"beats": [{"scene": "scene number or name", "shot": "shot/visual direction", "line": "voiceover or on-screen line"}]}}.',
};

export const ANGLES = ['Fear/Urgency', 'Value/Savings', 'Social Proof', 'Scarcity', 'Direct/No-BS'];

export const MATRIX_PROMPT =
  'You are an expert direct-response copywriter for a local-service marketing agency. ' +
  `Write 5 distinct marketing hooks for the same offer, one for each of these angles in this exact order: ${ANGLES.join(', ')}. ` +
  'Each hook should read like a different ad, not a variation of the same sentence. ' +
  'Return a valid JSON object matching this structure exactly: {"angles": [{"angle": "one of the 5 angle names above", "title": "short internal label", "content": "the generated copy for this angle"}]} with exactly 5 entries in the array, in the order given.';

export const DRIP_PROMPT =
  'You are an expert lifecycle/retention copywriter for a local-service marketing agency. ' +
  'Write a 3-step follow-up drip sequence (Day 1, Day 3, Day 7) for a lead who requested a quote but has not yet responded. ' +
  'Each step should escalate gently — reminder, value-add, final nudge — and specify SMS or Email as the channel. ' +
  'Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the full sequence as readable text", "metadata": {"steps": [{"day": "Day 1", "channel": "SMS or Email", "content": "the message text"}]}} with exactly 3 entries in the steps array, in order.';

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

export const DCO_PROMPT =
  'You are an expert direct-response copywriter running a Dynamic Creative Optimization campaign. ' +
  'You will be given a base offer/hook, a list of locations, and a list of audience segments. ' +
  "For EVERY combination of location and segment, write one distinct copy variant that naturally swaps in that location's geo-reference and that segment's demographic trigger/pain-point — same base offer, localized and personalized language. " +
  'Return a valid JSON object matching this structure exactly: {"variants": [{"location": "the location", "segment": "the audience segment", "title": "short internal label", "content": "the generated copy for this location+segment combination"}]} with one entry for every location × segment combination, covering all combinations.';

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

export async function callOpenAiJson(systemPrompt: string, userContext: string): Promise<any> {
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext },
      ],
    }),
  });

  const aiData = await aiResponse.json();
  if (!aiResponse.ok) {
    throw new Error(aiData?.error?.message || 'OpenAI request failed');
  }
  return JSON.parse(aiData.choices[0].message.content);
}

export async function callOpenAiVisionJson(systemPrompt: string, imageUrl: string): Promise<any> {
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this competitor ad image.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  const aiData = await aiResponse.json();
  if (!aiResponse.ok) {
    throw new Error(aiData?.error?.message || 'OpenAI request failed');
  }
  return JSON.parse(aiData.choices[0].message.content);
}

export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }> = {
  Energetic: { voice: 'onyx', instructions: 'Deliver with upbeat, high energy, fast-paced enthusiasm.' },
  Professional: { voice: 'onyx', instructions: 'Deliver clear, confident, measured, corporate-neutral.' },
  Warm: { voice: 'onyx', instructions: 'Deliver friendly, reassuring, at a relaxed conversational pace.' },
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

export const LANDING_PAGE_PROMPT =
  'You are an expert direct-response landing page copywriter for a local-service marketing agency. ' +
  'Given either a source ad/hook to match or a brief, write a matching landing page copy set: a hero headline that echoes the source hook, a supporting subheadline, a primary CTA button label, exactly 3 value-proposition bullets, and one social-proof testimonial. ' +
  'Write the testimonial as a short, generic, clearly-placeholder quote attributed to a role and location (e.g. "— Homeowner, Springfield"), never a fabricated named individual — a real client quote replaces it before publishing. ' +
  'Return a valid JSON object matching this structure exactly: {"title": "short internal label", "content": "the subheadline", "metadata": {"heroHeadline": "the hero headline", "subheadline": "the subheadline", "primaryCta": "the CTA button label", "valueProps": ["value prop 1", "value prop 2", "value prop 3"], "testimonial": "the placeholder testimonial quote"}} with exactly 3 entries in the valueProps array.';

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
