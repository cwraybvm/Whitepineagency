import { NextResponse } from 'next/server';
import { SWIPE_VISION_PROMPT, REMIX_PROMPT, brandClauseFor, callOpenAiJson, callOpenAiVisionJson } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'analyze') {
      const { imageUrl } = body;
      if (!imageUrl) {
        return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
      }
      const insights = await callOpenAiVisionJson(SWIPE_VISION_PROMPT, imageUrl);
      return NextResponse.json({ success: true, ...insights });
    }

    if (action === 'remix') {
      const { insights, organizationId, prompt } = body;
      if (!insights) {
        return NextResponse.json({ error: 'insights is required' }, { status: 400 });
      }

      const brandClause = await brandClauseFor(organizationId);
      const userContext = [
        `Competitor ad analysis: ${JSON.stringify(insights)}`,
        prompt && `Our offer/brief: ${prompt}`,
      ].filter(Boolean).join('\n');

      const result = await callOpenAiJson(`${REMIX_PROMPT}\n\n${brandClause}`, userContext);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "action must be 'analyze' or 'remix'" }, { status: 400 });
  } catch (err: any) {
    console.error('Sandbox analyze-swipe error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
