import { buildPlatformPayload } from '../src/lib/platformExport';

type Case = {
  name: string;
  asset: { id: string; type: string; content: string; metadata: any };
  expected: { headline: string; body: string; creativeUrl: string | null };
};

const cases: Case[] = [
  {
    name: 'AD with headline + imageUrl',
    asset: { id: 'a1', type: 'AD', content: 'Book your free inspection today.', metadata: { headline: 'Free Roof Inspection', imageUrl: 'https://example.com/roof.jpg' } },
    expected: { headline: 'Free Roof Inspection', body: 'Book your free inspection today.', creativeUrl: 'https://example.com/roof.jpg' },
  },
  {
    name: 'AD missing headline falls back to first sentence',
    asset: { id: 'a2', type: 'AD', content: 'Call now for a quote. Limited slots.', metadata: {} },
    expected: { headline: 'Call now for a quote.', body: 'Call now for a quote. Limited slots.', creativeUrl: null },
  },
  {
    name: 'LANDING_PAGE uses heroHeadline + subheadline',
    asset: { id: 'a3', type: 'LANDING_PAGE', content: 'subheadline body', metadata: { heroHeadline: 'Your Roof, Done Right', subheadline: 'Same-day emergency repair' } },
    expected: { headline: 'Your Roof, Done Right', body: 'Same-day emergency repair', creativeUrl: null },
  },
  {
    name: 'VIDEO_SCRIPT uses first beat line + audioUrl',
    asset: { id: 'a4', type: 'VIDEO_SCRIPT', content: 'full script text', metadata: { beats: [{ line: 'Your roof, done right.', audioUrl: 'https://blob.example/a.mp3' }] } },
    expected: { headline: 'Your roof, done right.', body: 'full script text', creativeUrl: 'https://blob.example/a.mp3' },
  },
  {
    name: 'COPY (default) uses first sentence of content',
    asset: { id: 'a5', type: 'COPY', content: 'Emergency plumbing, 24/7. Call now.', metadata: {} },
    expected: { headline: 'Emergency plumbing, 24/7.', body: 'Emergency plumbing, 24/7. Call now.', creativeUrl: null },
  },
];

let failures = 0;
for (const { name, asset, expected } of cases) {
  const result = buildPlatformPayload(asset, 'META', 'https://client.example.com');
  const ok =
    result.headline === expected.headline &&
    result.body === expected.body &&
    result.creativeUrl === expected.creativeUrl &&
    result.assetId === asset.id &&
    result.platform === 'META' &&
    result.targetUrl === 'https://client.example.com';
  if (!ok) {
    failures++;
    console.error(`FAIL: ${name}`, { result, expected });
  }
}
if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('All platform export cases passed');
