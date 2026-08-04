import { NextResponse } from 'next/server';
import { validateExtractBrandUrl, BRAND_EXTRACT_PROMPT, callOpenAiJson, mockBrandExtraction } from '@/lib/sandboxPrompts';
import { stripToPlainText, extractHexColors, MAX_EXTRACT_CHARS } from '@/lib/htmlExtract';

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 300_000;

async function fetchPageWithLimits(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WhitePinePortal-BrandDNA/1.0' },
    });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) return await res.text();

    const decoder = new TextDecoder();
    let html = '';
    let bytesRead = 0;
    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateExtractBrandUrl(body?.url);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const { url } = body as { url: string };

    let html: string;
    try {
      html = await fetchPageWithLimits(url);
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'Timed out fetching the URL' : err.message || 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const pageText = stripToPlainText(html).slice(0, MAX_EXTRACT_CHARS);
    const candidateColors = extractHexColors(html);

    const userContext = [
      `Page text extracted from ${url}:`,
      pageText,
      candidateColors.length ? `Candidate accent colors found in the page's CSS: ${candidateColors.join(', ')}` : '',
    ].filter(Boolean).join('\n\n');

    const result = await callOpenAiJson(BRAND_EXTRACT_PROMPT, userContext, () => mockBrandExtraction(url));

    const brandGuidelines = [
      result.valueProp && `Value Proposition: ${result.valueProp}`,
      result.targetAudience && `Target Audience: ${result.targetAudience}`,
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      brandVoice: result.brandVoice || '',
      brandGuidelines,
      accentColors: Array.isArray(result.accentColors) ? result.accentColors.slice(0, 6) : [],
    });
  } catch (err: any) {
    console.error('Sandbox extract-brand error:', err);
    return NextResponse.json({ error: err.message || 'Brand extraction failed' }, { status: 500 });
  }
}
