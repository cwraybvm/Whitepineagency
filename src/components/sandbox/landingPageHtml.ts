import type { LandingPageDraft } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLandingPageHtml(draft: LandingPageDraft, brandColor?: string | null): string {
  const accent = brandColor && /^#[0-9a-fA-F]{3,8}$/.test(brandColor) ? brandColor : '#059669';
  const { heroHeadline, subheadline, primaryCta, valueProps, testimonial, guaranteeBadge } = draft.metadata;

  const valuePropsHtml = valueProps
    .filter(Boolean)
    .map(
      (vp) => `
        <li class="flex items-center gap-2 text-slate-700">
          <span class="inline-block w-2 h-2 rounded-full" style="background-color:${accent}"></span>
          <span>${escapeHtml(vp)}</span>
        </li>`,
    )
    .join('');

  const badgeHtml = guaranteeBadge
    ? `<span class="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full border" style="border-color:${accent};color:${accent}">${escapeHtml(guaranteeBadge)}</span>`
    : '';

  const testimonialHtml = testimonial
    ? `
      <blockquote class="mt-10 max-w-xl mx-auto text-center italic text-slate-600 border-l-4 pl-4" style="border-color:${accent}">
        "${escapeHtml(testimonial)}"
      </blockquote>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(draft.title || 'Landing Page Preview')}</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white font-sans">
  <main class="max-w-3xl mx-auto px-6 py-16 text-center">
    <h1 class="text-4xl font-black text-slate-900 leading-tight">${escapeHtml(heroHeadline)}</h1>
    <p class="mt-4 text-lg text-slate-600">${escapeHtml(subheadline)}</p>
    <ul class="mt-8 flex flex-col items-start gap-2 max-w-sm mx-auto text-left">${valuePropsHtml}</ul>
    <a href="#" class="inline-block mt-8 px-6 py-3 rounded-lg text-white font-bold" style="background-color:${accent}">${escapeHtml(primaryCta)}</a>
    ${badgeHtml}
    ${testimonialHtml}
  </main>
</body>
</html>`;
}
