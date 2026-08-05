import { NextResponse } from 'next/server';
import { MASTER_CAMPAIGN_PROMPT, callOpenAiJson, mockMasterCampaignPackage, MasterCampaignPackageSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { location, promoOffer, activeBrandDna } = await req.json();
    if (!location || !promoOffer) {
      return NextResponse.json({ error: 'location and promoOffer are required' }, { status: 400 });
    }

    const userContext = `Location: ${location}\nPromo offer: ${promoOffer}`;

    const result = await callOpenAiJson(
      MASTER_CAMPAIGN_PROMPT,
      userContext,
      () => mockMasterCampaignPackage(location, promoOffer),
      0.7,
      MasterCampaignPackageSchema,
      activeBrandDna,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox master-campaign error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
