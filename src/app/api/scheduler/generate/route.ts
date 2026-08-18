import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgMember } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-5';

const PLATFORM_RULES: Record<string, string> = {
  LINKEDIN: 'LinkedIn: professional tone, up to ~600 characters, 3-5 relevant hashtags at the end.',
  FACEBOOK: 'Facebook: conversational tone, up to ~400 characters, 2-3 hashtags at the end.',
  INSTAGRAM: 'Instagram: visual, engaging tone, up to ~300 characters before hashtags, 5-8 hashtags at the end.',
  X_TWITTER: 'X (Twitter): punchy, concise, MUST fit within 280 characters including hashtags, 1-2 hashtags.',
};

export async function POST(req: Request) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic, tone, platform } = (await req.json().catch(() => ({}))) as {
    topic?: string;
    tone?: string;
    platform?: string;
  };
  if (!topic?.trim() || !tone?.trim() || !platform || !PLATFORM_RULES[platform]) {
    return NextResponse.json({ error: 'topic, tone, and a valid platform are required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI generation is not configured' }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = `You are a social media copywriter. Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{ "content": string, "hashtags": string[] }
"content" must NOT include the hashtags inline (they are returned separately). "hashtags" entries must NOT include the leading # symbol (just the word). Platform rules:
${PLATFORM_RULES[platform]}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Topic: ${topic}\nTone: ${tone}\nPlatform: ${platform}` }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Anthropic response contained no text block');
    const parsed = JSON.parse(textBlock.text) as { content: string; hashtags: string[] };
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[SCHEDULER_GENERATE_ERROR]', err);
    return NextResponse.json({ error: 'Failed to generate post draft' }, { status: 502 });
  }
}
