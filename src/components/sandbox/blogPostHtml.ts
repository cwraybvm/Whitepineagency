import { marked } from 'marked';
import type { BlogPostPackage, MediaAsset } from '@/lib/sandboxPrompts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mediaFigureHtml(media: MediaAsset): string {
  const caption = media.caption
    ? `<figcaption class="text-sm text-slate-500 mt-2 text-center">${escapeHtml(media.caption)}</figcaption>`
    : '';
  const body =
    media.type === 'video'
      ? `<video controls class="w-full rounded-lg" src="${escapeHtml(media.url)}"></video>`
      : `<img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.altText || media.caption || '')}" class="w-full rounded-lg object-cover" />`;
  return `<figure class="my-8">${body}${caption}</figure>`;
}

export function renderBlogPostHtml(
  pkg: BlogPostPackage,
  media: MediaAsset[],
  placementAssignments: Record<string, number | null>,
  brandColor?: string | null,
): string {
  const accent = brandColor && /^#[0-9a-fA-F]{3,8}$/.test(brandColor) ? brandColor : '#059669';

  let bodyHtml = marked.parse(pkg.contentMarkdown || '') as string;
  for (const placement of pkg.suggestedMediaPlacements) {
    const marker = `{{media:${placement.placementTag}}}`;
    const assignedIndex = placementAssignments[placement.placementTag];
    const assignedMedia = assignedIndex != null ? media[assignedIndex] : undefined;
    const replacement = assignedMedia ? mediaFigureHtml(assignedMedia) : '';
    // marked wraps a marker sitting on its own line in <p>…</p> — collapse
    // that wrapper too so the replacement figure isn't nested inside a <p>.
    const wrappedMarker = `<p>${marker}</p>`;
    bodyHtml = bodyHtml.includes(wrappedMarker)
      ? bodyHtml.replaceAll(wrappedMarker, replacement)
      : bodyHtml.replaceAll(marker, replacement);
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pkg.title || 'Blog Post Preview')}</title>
<meta name="description" content="${escapeHtml(pkg.metaDescription)}" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
  .article-body h2 { font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-top: 2rem; margin-bottom: 0.75rem; }
  .article-body h3 { font-size: 1.25rem; font-weight: 700; color: #0F172A; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  .article-body p { margin-bottom: 1rem; line-height: 1.75; color: #334155; }
  .article-body ul, .article-body ol { margin: 1rem 0 1rem 1.5rem; color: #334155; }
  .article-body li { margin-bottom: 0.375rem; }
  .article-body a { color: ${accent}; text-decoration: underline; }
  .article-body strong { font-weight: 700; color: #0F172A; }
  .article-body blockquote { border-left: 4px solid ${accent}; padding-left: 1rem; font-style: italic; color: #475569; margin: 1.5rem 0; }
</style>
</head>
<body class="bg-white font-sans">
  <article class="max-w-2xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-black text-slate-900 leading-tight">${escapeHtml(pkg.title)}</h1>
    <p class="mt-3 text-slate-500 text-sm">${pkg.readTimeMinutes} min read</p>
    <p class="mt-4 text-lg text-slate-600 italic">${escapeHtml(pkg.excerpt)}</p>
    <div class="article-body mt-10">${bodyHtml}</div>
    <a href="#" class="inline-block mt-10 px-6 py-3 rounded-lg text-white font-bold" style="background-color:${accent}">${escapeHtml(pkg.callToAction)}</a>
  </article>
</body>
</html>`;
}
