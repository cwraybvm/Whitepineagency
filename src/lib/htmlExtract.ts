import * as cheerio from 'cheerio';

export const MAX_EXTRACT_CHARS = 8000;

export function stripToPlainText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const EXCLUDED = new Set(['#fff', '#ffffff', '#000', '#000000']);

// A real Chrome UA — some sites serve stripped-down markup (or block outright)
// to unrecognized bot UAs, which was silently degrading scrape quality.
export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

const STYLESHEET_FETCH_TIMEOUT_MS = 4000;
const MAX_STYLESHEETS = 3;

// Extends extractHexColors with colors pulled from linked <link rel="stylesheet">
// files — most sites keep their real brand palette there, not inline.
// Unreachable/blocked stylesheets are skipped rather than failing the whole scrape.
export async function extractHexColorsWithStylesheets(html: string, baseUrl: string): Promise<string[]> {
  const colors = new Set<string>(extractHexColors(html));
  const $ = cheerio.load(html);
  const hrefs: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) hrefs.push(href);
  });

  for (const href of hrefs.slice(0, MAX_STYLESHEETS)) {
    try {
      const resolved = new URL(href, baseUrl).toString();
      const res = await fetch(resolved, {
        signal: AbortSignal.timeout(STYLESHEET_FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': CHROME_USER_AGENT },
      });
      if (!res.ok) continue;
      const css = await res.text();
      for (const m of css.match(HEX_COLOR_PATTERN) || []) colors.add(m.toLowerCase());
    } catch {
      // stylesheet unreachable/blocked — skip, don't fail the scrape over it
    }
  }

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
      headers: { 'User-Agent': CHROME_USER_AGENT },
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

export interface PageMeta {
  title: string;
  ogTitle: string;
  ogImage: string;
  description: string;
}

export function extractPageMeta(html: string): PageMeta {
  const $ = cheerio.load(html);
  return {
    title: $('title').first().text().trim(),
    ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || '',
    ogImage: $('meta[property="og:image"]').attr('content')?.trim() || '',
    description:
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '',
  };
}
