import { NextResponse } from 'next/server';
import {
  SYSTEM_PROMPTS,
  MATRIX_PROMPT,
  DCO_PROMPT,
  brandClauseFor,
  callOpenAiJson,
  basePromptForType,
  refineInstructions,
  mockCopy,
  mockCopyMatrix,
  mockAd,
  mockVideo,
  mockDcoVariants,
  AssetDraftSchema,
  AdBuilderSchema,
  VideoLabSchema,
  CopyStudioSchema,
  type SandboxGenTool,
} from '@/lib/sandboxPrompts';
import type { ScorableType } from '@/lib/creativeScore';

const VALID_SCORABLE_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP', 'LANDING_PAGE', 'BLOG_POST'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, organizationId } = body;

    if (mode === 'refine') {
      const { type, content, metadata, feedback } = body;
      if (!VALID_SCORABLE_TYPES.includes(type)) {
        return NextResponse.json({ error: `type must be one of ${VALID_SCORABLE_TYPES.join(', ')}` }, { status: 400 });
      }
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'content is required' }, { status: 400 });
      }

      const brandClause = await brandClauseFor(organizationId);
      const systemPrompt = `${basePromptForType(type)}\n\n${refineInstructions(Array.isArray(feedback) ? feedback : [])}\n\n${brandClause}`;
      const userContext = [
        `Existing content: ${content}`,
        metadata && `Existing metadata: ${JSON.stringify(metadata)}`,
      ].filter(Boolean).join('\n');

      const result = await callOpenAiJson(
        systemPrompt,
        userContext,
        () => ({ title: '[MOCK REFINED]', content: `[MOCK REFINED] ${content}`, metadata }),
        0.7,
        AssetDraftSchema,
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (mode === 'dco') {
      const { tool, prompt, locations, audienceSegments } = body;
      if (tool !== 'copy') {
        return NextResponse.json({ error: 'DCO mode is only available for the copy tool' }, { status: 400 });
      }
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt (base offer/hook) is required' }, { status: 400 });
      }
      if (!Array.isArray(locations) || locations.length === 0 || !Array.isArray(audienceSegments) || audienceSegments.length === 0) {
        return NextResponse.json({ error: 'At least one location and one audience segment are required' }, { status: 400 });
      }

      const brandClause = await brandClauseFor(organizationId);
      const systemPrompt = `${DCO_PROMPT}\n\n${brandClause}`;
      const userContext = [
        `Base offer/hook: ${prompt}`,
        `Locations: ${locations.join(', ')}`,
        `Audience segments: ${audienceSegments.join(', ')}`,
      ].join('\n');

      const result = await callOpenAiJson(
        systemPrompt,
        userContext,
        () => mockDcoVariants(prompt, locations, audienceSegments),
        0.7,
        CopyStudioSchema.dco,
      );
      return NextResponse.json({ success: true, ...result });
    }

    // Default: single / matrix copy-ad-video generation
    const { tool, prompt, tone, platform, lengthSeconds, activeBrandDna } = body;

    if (!tool || !SYSTEM_PROMPTS[tool as SandboxGenTool]) {
      return NextResponse.json({ error: 'Invalid tool' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    const isMatrix = mode === 'matrix';
    if (isMatrix && tool !== 'copy') {
      return NextResponse.json({ error: 'Matrix mode is only available for the copy tool' }, { status: 400 });
    }

    const brandClause = await brandClauseFor(organizationId);
    const systemPrompt = `${isMatrix ? MATRIX_PROMPT : SYSTEM_PROMPTS[tool as SandboxGenTool]}\n\n${brandClause}`;

    const userContext = [
      `Brief: ${prompt}`,
      !isMatrix && tone && `Tone: ${tone}`,
      platform && `Platform: ${platform}`,
      lengthSeconds && `Target length: ~${lengthSeconds} seconds`,
    ].filter(Boolean).join('\n');

    const mockFallback = isMatrix
      ? () => mockCopyMatrix(prompt)
      : tool === 'ad'
        ? () => mockAd(prompt)
        : tool === 'video'
          ? () => mockVideo(prompt)
          : () => mockCopy(prompt);

    const schema = isMatrix
      ? CopyStudioSchema.matrix
      : tool === 'ad'
        ? AdBuilderSchema
        : tool === 'video'
          ? VideoLabSchema
          : CopyStudioSchema.draft;

    const result = await callOpenAiJson(systemPrompt, userContext, mockFallback, 0.7, schema, activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox generate error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
