import * as cheerio from 'cheerio';

export const MAX_EXTRACT_CHARS = 8000;

export function stripToPlainText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const EXCLUDED = new Set(['#fff', '#ffffff', '#000', '#000000']);

export function extractHexColors(html: string): string[] {
  const $ = cheerio.load(html);
  const colors = new Set<string>();

  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    for (const m of style.match(HEX_COLOR_PATTERN) || []) colors.add(m.toLowerCase());
  });
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    for (const m of css.match(HEX_COLOR_PATTERN) || []) colors.add(m.toLowerCase());
  });

  for (const excluded of EXCLUDED) colors.delete(excluded);
  return Array.from(colors).slice(0, 12);
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_FETCH_BYTES = 300_000;

export async function fetchHtmlWithLimits(url: string): Promise<string> {
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
    while (bytesRead < MAX_FETCH_BYTES) {
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

const MAX_IMAGE_URLS = 20;

export function extractImageUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  const addCandidate = (raw: string | undefined) => {
    if (!raw) return;
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.protocol === 'data:') return;
      urls.add(resolved.toString());
    } catch {
      // ignore unparseable URLs
    }
  };

  $('meta[property="og:image"]').each((_, el) => addCandidate($(el).attr('content')));
  $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').each((_, el) =>
    addCandidate($(el).attr('href')),
  );
  $('img[src]').each((_, el) => addCandidate($(el).attr('src')));

  return Array.from(urls).slice(0, MAX_IMAGE_URLS);
}

export function extractPageTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').first().text().trim();
}
