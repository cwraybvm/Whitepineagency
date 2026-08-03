export type Platform = 'META' | 'GOOGLE' | 'TIKTOK';

export type PlatformPayload = {
  assetId: string;
  platform: Platform;
  headline: string;
  body: string;
  creativeUrl: string | null;
  targetUrl: string;
};

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return (match?.[0] || text).trim();
}

export function buildPlatformPayload(
  asset: { id: string; type: string; content: string; metadata: any },
  platform: Platform,
  targetUrl: string
): PlatformPayload {
  const metadata = asset.metadata || {};
  let headline: string;
  let body: string;
  let creativeUrl: string | null;

  if (asset.type === 'AD') {
    headline = metadata.headline || firstSentence(asset.content);
    body = asset.content;
    creativeUrl = metadata.imageUrl || null;
  } else if (asset.type === 'LANDING_PAGE') {
    headline = metadata.heroHeadline || firstSentence(asset.content);
    body = metadata.subheadline || asset.content;
    creativeUrl = null;
  } else if (asset.type === 'VIDEO_SCRIPT') {
    headline = metadata.beats?.[0]?.line || firstSentence(asset.content);
    body = asset.content;
    creativeUrl = metadata.beats?.[0]?.audioUrl || null;
  } else {
    headline = firstSentence(asset.content);
    body = asset.content;
    creativeUrl = null;
  }

  return { assetId: asset.id, platform, headline, body, creativeUrl, targetUrl };
}
