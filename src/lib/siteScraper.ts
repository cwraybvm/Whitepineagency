import * as cheerio from 'cheerio';

export interface ScrapedSocialLink {
  platform: string;
  url: string;
}

export interface ScrapedSite {
  url: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  socialLinks: ScrapedSocialLink[];
  textSnippet: string;
}

const SOCIAL_HOSTS: { platform: string; match: RegExp }[] = [
  { platform: 'Facebook', match: /facebook\.com/i },
  { platform: 'Instagram', match: /instagram\.com/i },
  { platform: 'X / Twitter', match: /(twitter\.com|x\.com)/i },
  { platform: 'LinkedIn', match: /linkedin\.com/i },
  { platform: 'TikTok', match: /tiktok\.com/i },
  { platform: 'YouTube', match: /youtube\.com/i },
];

function normalizeUrl(rawUrl: string): string {
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
}

/** Real fetch + cheerio parse -- title, meta description, OG image, social
 * links, and a plain-text content snippet for feeding an LLM. No headless
 * browser: cheerio is a static-HTML parser, so JS-rendered sites will yield
 * thinner results (fine for the marketing-site case this targets). */
export async function scrapeSite(rawUrl: string): Promise<ScrapedSite> {
  const url = normalizeUrl(rawUrl.trim());

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhitePineAuditBot/1.0; +https://whitepine.portal)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Site returned ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || null;
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;

  const socialLinks: ScrapedSocialLink[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    for (const { platform, match } of SOCIAL_HOSTS) {
      if (match.test(href) && !socialLinks.some((s) => s.platform === platform)) {
        socialLinks.push({ platform, url: href });
        break;
      }
    }
  });

  const textSnippet = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500);

  return { url, title, description, ogImage, socialLinks, textSnippet };
}
