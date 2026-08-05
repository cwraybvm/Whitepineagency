import { renderLandingPageHtml } from '../src/components/sandbox/landingPageHtml';
import type { LandingPageDraft } from '../src/components/sandbox/types';

const draft: LandingPageDraft = {
  title: 'Test Page',
  content: 'subhead',
  metadata: {
    heroHeadline: 'Emergency Roof Repair <Today>',
    subheadline: 'Same-day service',
    primaryCta: 'Get a Quote',
    valueProps: ['Licensed & Insured', 'Same-Day Availability'],
    testimonial: 'They fixed it fast!',
    guaranteeBadge: '100% Satisfaction Guaranteed',
  },
};

const html = renderLandingPageHtml(draft, '#2563eb');

const checks: [string, boolean][] = [
  ['contains escaped headline', html.includes('Emergency Roof Repair &lt;Today&gt;')],
  ['contains subheadline', html.includes('Same-day service')],
  ['contains both value props', html.includes('Licensed &amp; Insured') && html.includes('Same-Day Availability')],
  ['contains CTA text', html.includes('Get a Quote')],
  ['contains guarantee badge', html.includes('100% Satisfaction Guaranteed')],
  ['contains testimonial', html.includes('They fixed it fast')],
  ['uses brand color', html.includes('#2563eb')],
  ['loads tailwind CDN', html.includes('cdn.tailwindcss.com')],
];

const noBadgeHtml = renderLandingPageHtml({ ...draft, metadata: { ...draft.metadata, guaranteeBadge: undefined } });
checks.push(['omits badge markup when unset', !noBadgeHtml.includes('rounded-full border')]);

let failures = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    failures++;
    console.error(`FAIL: ${label}`);
  }
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All landing page HTML checks passed');
