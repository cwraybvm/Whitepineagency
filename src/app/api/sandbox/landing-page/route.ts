import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateLandingPageInput, LANDING_PAGE_PROMPT, brandClauseFor, callOpenAiJson, mockLandingPage, LandingPageSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationError = validateLandingPageInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { mode, organizationId } = body;

    let userContext: string;
    let hook: string;
    if (mode === 'asset') {
      const asset = await prisma.creativeAsset.findUnique({ where: { id: body.assetId } });
      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }
      userContext = [
        `Source ad/hook to match — title: ${asset.title}`,
        `Content: ${asset.content}`,
        asset.metadata && `Metadata: ${JSON.stringify(asset.metadata)}`,
      ].filter(Boolean).join('\n');
      hook = asset.title;
    } else {
      userContext = `Brief: ${body.prompt}`;
      hook = body.prompt;
    }

    const brandClause = await brandClauseFor(organizationId);
    const systemPrompt = `${LANDING_PAGE_PROMPT}\n\n${brandClause}`;

    const result = await callOpenAiJson(systemPrompt, userContext, () => mockLandingPage(hook), 0.7, LandingPageSchema);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox landing-page error:', err);
    return NextResponse.json({ error: err.message || 'Landing page generation failed' }, { status: 500 });
  }
}
