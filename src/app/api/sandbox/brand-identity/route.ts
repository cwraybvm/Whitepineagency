import { NextResponse } from 'next/server';
import { validateExtractBrandUrl } from '@/lib/sandboxPrompts';
import { extractBrandFromUrl } from '@/lib/brandExtractor';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateExtractBrandUrl(body?.url);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    try {
      const identity = await extractBrandFromUrl(body.url);
      return NextResponse.json({ success: true, ...identity });
    } catch (err: any) {
      const details = err?.name === 'AbortError' ? 'Timed out fetching the URL' : err.message || 'Failed to fetch URL';
      return NextResponse.json({ error: 'OpenAI Key Missing or Scrape Failed', details }, { status: 502 });
    }
  } catch (err: any) {
    console.error('Sandbox brand-identity error:', err);
    return NextResponse.json({ error: err.message || 'Brand identity extraction failed' }, { status: 500 });
  }
}
