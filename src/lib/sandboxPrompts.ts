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

export async function callOpenAiJson(systemPrompt: string, userContext: string, mockFallback?: () => any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    if (mockFallback) return mockFallback();
    throw new OpenAiNotConfiguredError();
  }

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

export async function callOpenAiVisionJson(systemPrompt: string, imageUrl: string, mockFallback?: () => any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    if (mockFallback) return mockFallback();
    throw new OpenAiNotConfiguredError();
  }

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
