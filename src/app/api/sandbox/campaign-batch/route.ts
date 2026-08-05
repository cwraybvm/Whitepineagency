import { NextResponse } from 'next/server';
import {
  SYSTEM_PROMPTS,
  MATRIX_PROMPT,
  DRIP_PROMPT,
  brandClauseFor,
  callOpenAiJson,
  mockCopyMatrix,
  mockAd,
  mockVideo,
  mockDrip,
  CopyStudioSchema,
  AdBuilderSchema,
  VideoLabSchema,
  DripSchema,
  CampaignBatchSchema,
} from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { organizationId, campaignGoal, targetAudience, activeBrandDna } = await req.json();

    if (!campaignGoal) {
      return NextResponse.json({ error: 'campaignGoal is required' }, { status: 400 });
    }

    const brandClause = await brandClauseFor(organizationId);
    const userContext = [
      `Campaign goal: ${campaignGoal}`,
      `Target audience: ${targetAudience || 'general local customers'}`,
    ].join('\n');

    const [angles, ad, video, drip] = await Promise.all([
      callOpenAiJson(`${MATRIX_PROMPT}\n\n${brandClause}`, userContext, () => mockCopyMatrix(campaignGoal), 0.7, CopyStudioSchema.matrix, activeBrandDna),
      callOpenAiJson(`${SYSTEM_PROMPTS.ad}\n\n${brandClause}`, userContext, () => mockAd(campaignGoal), 0.7, AdBuilderSchema, activeBrandDna),
      callOpenAiJson(`${SYSTEM_PROMPTS.video}\n\n${brandClause}`, userContext, () => mockVideo(campaignGoal), 0.7, VideoLabSchema, activeBrandDna),
      callOpenAiJson(`${DRIP_PROMPT}\n\n${brandClause}`, userContext, () => mockDrip(campaignGoal), 0.7, DripSchema, activeBrandDna),
    ]);

    const batch = CampaignBatchSchema.parse({ angles: angles.angles, ad, video, drip });

    return NextResponse.json({ success: true, ...batch });
  } catch (err: any) {
    console.error('Sandbox campaign-batch error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
