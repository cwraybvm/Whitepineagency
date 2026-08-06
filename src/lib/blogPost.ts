import {
  BLOG_POST_PROMPT,
  callOpenAiJson,
  mockBlogPostPackage,
  BlogPostPackageSchema,
  type BlogPostPackage,
  type MediaAsset,
  type BrandDna,
} from '@/lib/sandboxPrompts';
import type { BlogPostTone } from '@/components/sandbox/types';

export async function generateBlogPostPackage(
  mode: 'notes' | 'draft',
  text: string,
  tone: BlogPostTone,
  media: MediaAsset[],
  brandDna?: BrandDna,
): Promise<BlogPostPackage> {
  const userContext = [
    `Input mode: ${mode === 'notes' ? 'raw notes — write a full post from scratch' : 'existing draft — restructure, polish, and SEO-optimize without inventing new claims'}`,
    `Tone: ${tone}`,
    media.length
      ? `Available media (reference by placementTag in suggestedMediaPlacements — use only where it genuinely helps):\n${media.map((m, i) => `${i + 1}. [${m.type}] ${m.caption || '(no caption)'}`).join('\n')}`
      : 'No media provided.',
    mode === 'notes' ? 'Raw notes:' : 'Existing draft:',
    text,
  ].join('\n\n');

  return callOpenAiJson(BLOG_POST_PROMPT, userContext, () => mockBlogPostPackage(text, mode), 0.7, BlogPostPackageSchema, brandDna);
}
