import { NextResponse } from 'next/server';
import { generateMasterCampaign } from '@/lib/masterCampaign';

export async function POST(req: Request) {
  try {
    const { location, promoOffer, activeBrandDna } = await req.json();
    if (!location || !promoOffer) {
      return NextResponse.json({ error: 'location and promoOffer are required' }, { status: 400 });
    }

    const result = await generateMasterCampaign(location, promoOffer, activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox master-campaign error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
