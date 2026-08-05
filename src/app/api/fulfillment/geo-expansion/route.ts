import { NextResponse } from 'next/server';
import { GEO_EXPANSION_PROMPT, callOpenAiJson, mockGeoExpansionPackage, GeoExpansionPackageSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { coreService, offer, locations, brandName } = await req.json();

    if (!coreService || !offer || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: 'coreService, offer, and a non-empty locations array are required' },
        { status: 400 },
      );
    }

    const userContext = [
      `Core service: ${coreService}`,
      `Promo offer: ${offer}`,
      brandName ? `Brand name: ${brandName}` : '',
      `Target locations: ${locations.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOpenAiJson(
      GEO_EXPANSION_PROMPT,
      userContext,
      () => mockGeoExpansionPackage(locations, coreService, offer),
      0.7,
      GeoExpansionPackageSchema,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Geo-expansion generation error:', err);
    return NextResponse.json({ error: err.message || 'Geo-expansion generation failed' }, { status: 500 });
  }
}
