import type { Beat } from '@/components/sandbox/types';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCopyVariationsCsv(variations: { angle: string; title: string; content: string }[]): string {
  const rows = [
    ['Angle', 'Headline', 'Primary Text'],
    ...variations.map((v) => [v.angle, v.title, v.content]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function buildStoryboardMarkdown(video: { title: string; metadata: { beats: Beat[] } }): string {
  const lines = [`# ${video.title}`, ''];
  (video.metadata.beats || []).forEach((beat, i) => {
    lines.push(`**Scene ${i + 1} — ${beat.scene}**`);
    lines.push(`Visual: ${beat.shot}`);
    lines.push(`VO: ${beat.line}`);
    lines.push('');
  });
  return lines.join('\n');
}

export type ReadmeOptions = {
  organizationName?: string;
  campaignGoal?: string;
  targetAudience?: string;
  ad?: { title: string; content: string; metadata: { headline: string; cta: string } };
  notes: string[];
  generatedAt: string;
};

export function buildReadme(opts: ReadmeOptions): string {
  const lines = [
    'CAMPAIGN EXPORT PACK',
    `Generated: ${opts.generatedAt}`,
    `Organization: ${opts.organizationName || 'No client selected'}`,
    `Campaign Goal: ${opts.campaignGoal || '(not set)'}`,
    `Target Audience: ${opts.targetAudience || '(not set)'}`,
  ];
  if (opts.ad) {
    lines.push(
      '',
      'AD CREATIVE',
      `Title: ${opts.ad.title}`,
      `Headline: ${opts.ad.metadata.headline}`,
      `CTA: ${opts.ad.metadata.cta}`,
      `Body: ${opts.ad.content}`
    );
  }
  if (opts.notes.length > 0) {
    lines.push('', 'NOTES', ...opts.notes);
  }
  return lines.join('\n');
}
