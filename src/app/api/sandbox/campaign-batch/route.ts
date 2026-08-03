import { NextResponse } from 'next/server';
import { SYSTEM_PROMPTS, MATRIX_PROMPT, DRIP_PROMPT, brandClauseFor, callOpenAiJson } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { organizationId, campaignGoal, targetAudience } = await req.json();

    if (!campaignGoal) {
      return NextResponse.json({ error: 'campaignGoal is required' }, { status: 400 });
    }

    const brandClause = await brandClauseFor(organizationId);
    const userContext = [
      `Campaign goal: ${campaignGoal}`,
      `Target audience: ${targetAudience || 'general local customers'}`,
    ].join('\n');

    const [angles, ad, video, drip] = await Promise.all([
      callOpenAiJson(`${MATRIX_PROMPT}\n\n${brandClause}`, userContext),
      callOpenAiJson(`${SYSTEM_PROMPTS.ad}\n\n${brandClause}`, userContext),
      callOpenAiJson(`${SYSTEM_PROMPTS.video}\n\n${brandClause}`, userContext),
      callOpenAiJson(`${DRIP_PROMPT}\n\n${brandClause}`, userContext),
    ]);

    return NextResponse.json({
      success: true,
      angles: angles.angles,
      ad: { title: ad.title, content: ad.content, metadata: ad.metadata },
      video: { title: video.title, content: video.content, metadata: video.metadata },
      drip: { title: drip.title, content: drip.content, metadata: drip.metadata },
    });
  } catch (err: any) {
    console.error('Sandbox campaign-batch error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
