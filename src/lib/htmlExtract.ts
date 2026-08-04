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
