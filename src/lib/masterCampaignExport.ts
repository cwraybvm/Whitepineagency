import type { MasterCampaignPackage } from '@/lib/sandboxPrompts';

export function buildMasterCampaignMarkdown(pkg: MasterCampaignPackage, location: string, promoOffer: string): string {
  const lines = [
    `# 30-Day Campaign Package — ${location}`,
    `Promo offer: ${promoOffer}`,
    '',
    '## Meta Ads',
    ...(pkg.metaAds.length
      ? pkg.metaAds.map((ad, i) => `${i + 1}. **${ad.metadata?.headline || ad.title}** — ${ad.content} (CTA: ${ad.metadata?.cta || 'n/a'})`)
      : ['(none)']),
    '',
    '## Google Search Ads',
    ...(pkg.googleSearchAds.length
      ? pkg.googleSearchAds.map((ad, i) => `${i + 1}. **${ad.headline}** — ${ad.description}`)
      : ['(none)']),
    '',
    '## Google Business Posts',
    ...(pkg.googleBusinessPosts.length
      ? pkg.googleBusinessPosts.map((post, i) => `${i + 1}. **${post.title}** — ${post.content}`)
      : ['(none)']),
    '',
    '## Video Scripts',
    ...(pkg.videoScripts.length
      ? pkg.videoScripts.flatMap((video) => [
          `### ${video.title}`,
          ...(video.metadata?.beats || []).map((beat, i) => `${i + 1}. [${beat.scene}] ${beat.shot} — "${beat.line}"`),
          '',
        ])
      : ['(none)']),
    '## Email / SMS Blasts',
    ...(pkg.emailSmsBlasts.length
      ? pkg.emailSmsBlasts.map((blast) => `- **${blast.day} (${blast.channel})**: ${blast.content}`)
      : ['(none)']),
  ];
  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Channel = { id: string; label: string; html: string };

export function buildMasterCampaignHtml(
  pkg: MasterCampaignPackage,
  location: string,
  promoOffer: string,
  brandName?: string,
): string {
  const channels: Channel[] = [
    {
      id: 'meta',
      label: 'Meta Ads',
      html: pkg.metaAds
        .map(
          (ad) =>
            `<div class="card"><h3>${escapeHtml(ad.metadata?.headline || ad.title)}</h3><p>${escapeHtml(ad.content)}</p><span class="cta">${escapeHtml(ad.metadata?.cta || '')}</span></div>`,
        )
        .join(''),
    },
    {
      id: 'google-search',
      label: 'Google Search',
      html: pkg.googleSearchAds
        .map((ad) => `<div class="card"><h3>${escapeHtml(ad.headline)}</h3><p>${escapeHtml(ad.description)}</p></div>`)
        .join(''),
    },
    {
      id: 'google-business',
      label: 'Google Business',
      html: pkg.googleBusinessPosts
        .map((post) => `<div class="card"><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.content)}</p></div>`)
        .join(''),
    },
    {
      id: 'video',
      label: 'Video Scripts',
      html: pkg.videoScripts
        .map(
          (video) =>
            `<div class="card"><h3>${escapeHtml(video.title)}</h3><ol>${(video.metadata?.beats || [])
              .map((beat) => `<li><strong>${escapeHtml(beat.shot)}</strong> — "${escapeHtml(beat.line)}"</li>`)
              .join('')}</ol></div>`,
        )
        .join(''),
    },
    {
      id: 'email-sms',
      label: 'Email & SMS',
      html: pkg.emailSmsBlasts
        .map(
          (blast) =>
            `<div class="card"><h3>${escapeHtml(blast.day)} — ${escapeHtml(blast.channel)}</h3><p>${escapeHtml(blast.content)}</p></div>`,
        )
        .join(''),
    },
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>30-Day Campaign — ${escapeHtml(location)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 24px 32px; border-bottom: 1px solid #1e293b; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header p { margin: 0; color: #94a3b8; font-size: 13px; }
  nav { display: flex; gap: 4px; padding: 12px 32px; border-bottom: 1px solid #1e293b; flex-wrap: wrap; }
  nav button { background: transparent; border: 1px solid #334155; color: #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
  nav button.active { background: #059669; border-color: #059669; color: #fff; }
  main { padding: 24px 32px; }
  section { display: none; }
  section.active { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
  .card h3 { margin: 0 0 8px; font-size: 13px; }
  .card p { margin: 0; font-size: 13px; color: #cbd5e1; }
  .card ol { margin: 0; padding-left: 18px; font-size: 13px; color: #cbd5e1; }
  .cta { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; color: #34d399; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(brandName ? `${brandName} — 30-Day Campaign` : '30-Day Campaign')}</h1>
  <p>${escapeHtml(location)} · ${escapeHtml(promoOffer)}</p>
</header>
<nav>
  ${channels.map((c, i) => `<button data-target="${c.id}" class="${i === 0 ? 'active' : ''}">${escapeHtml(c.label)}</button>`).join('')}
</nav>
<main>
  ${channels.map((c, i) => `<section id="${c.id}" class="${i === 0 ? 'active' : ''}">${c.html}</section>`).join('')}
</main>
<script>
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('main section').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
</script>
</body>
</html>`;
}
