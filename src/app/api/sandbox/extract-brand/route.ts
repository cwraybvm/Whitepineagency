import { NextResponse } from 'next/server';
import { extractBrandFromUrl } from '@/lib/brandExtractor';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    let identity;
    try {
      identity = await extractBrandFromUrl(url as string);
    } catch (err: any) {
      const status = err?.name === 'AbortError' ? 502 : /url/i.test(err.message || '') ? 400 : 502;
      const message = err?.name === 'AbortError' ? 'Timed out fetching the URL' : err.message || 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status });
    }

    const brandGuidelines = [
      identity.coreValueProps.length && `Value Proposition: ${identity.coreValueProps.join('; ')}`,
      identity.targetAudienceProfile && `Target Audience: ${identity.targetAudienceProfile}`,
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      brandVoice: identity.brandVoice || '',
      brandGuidelines,
      accentColors: identity.colors.slice(0, 6),
      brandImages: identity.brandImages.slice(0, 6),
    });
  } catch (err: any) {
    console.error('Sandbox extract-brand error:', err);
    return NextResponse.json({ error: err.message || 'Brand extraction failed' }, { status: 500 });
  }
}
