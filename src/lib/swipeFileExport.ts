import type { ExtractedBrandIdentity } from '@/lib/sandboxPrompts';

export function buildSwipeFileMarkdown(identity: ExtractedBrandIdentity, sourceUrl: string): string {
  const lines = [
    `# ${identity.brandName || 'Brand'} — Swipe File`,
    `Source: ${sourceUrl}`,
    '',
    '## Brand Voice',
    identity.brandVoice || '(none)',
    '',
    '## Color Palette',
    ...(identity.colors.length ? identity.colors.map((c) => `- ${c}`) : ['(none)']),
    '',
    '## Asset Links',
    ...(identity.brandImages.length ? identity.brandImages.map((url) => `- ${url}`) : ['(none)']),
    '',
    '## Key Verbal Tracks',
    ...(identity.keyVerbalTracks.length ? identity.keyVerbalTracks.map((t) => `- "${t}"`) : ['(none)']),
    '',
    '## Active Ad Angles',
    ...(identity.activeAdAngles.length ? identity.activeAdAngles.map((a) => `- ${a}`) : ['(none)']),
    '',
    '## Core Value Props',
    ...(identity.coreValueProps.length ? identity.coreValueProps.map((v) => `- ${v}`) : ['(none)']),
    '',
    '## Target Audience Profile',
    identity.targetAudienceProfile || '(none)',
  ];
  return lines.join('\n');
}
