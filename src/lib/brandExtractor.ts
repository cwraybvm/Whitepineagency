import {
  validateExtractBrandUrl,
  BRAND_IDENTITY_EXTRACT_PROMPT,
  callOpenAiJson,
  callOpenAiVisionJson,
  ExtractedBrandIdentitySchema,
  IMAGE_PROMPT_VISION_PROMPT,
  ImagePromptSchema,
  mockImagePrompt,
  type ExtractedBrandIdentity,
} from '@/lib/sandboxPrompts';
import { fetchHtmlWithLimits, stripToPlainText, extractHexColorsWithStylesheets, extractImageUrls, extractPageMeta, MAX_EXTRACT_CHARS } from '@/lib/htmlExtract';

// No mockFallback is passed to callOpenAiJson here: a failed/unconfigured LLM
// must surface as a real error (see route handlers), never silently return
// fabricated [MOCK] brand data as if it were a genuine live scrape.
export async function extractBrandFromUrl(url: string): Promise<ExtractedBrandIdentity> {
  const validationError = validateExtractBrandUrl(url);
  if (validationError) throw new Error(validationError);

  const html = await fetchHtmlWithLimits(url);

  const { title, ogTitle, description } = extractPageMeta(html);
  const pageText = stripToPlainText(html).slice(0, MAX_EXTRACT_CHARS);
  const candidateColors = await extractHexColorsWithStylesheets(html, url);
  const candidateImages = extractImageUrls(html, url);

  const userContext = [
    title && `Page title: ${title}`,
    ogTitle && ogTitle !== title && `OG title: ${ogTitle}`,
    description && `Meta description: ${description}`,
    `Page text extracted from ${url}:`,
    pageText,
    candidateColors.length ? `Candidate hex colors found in the page's CSS: ${candidateColors.join(', ')}` : '',
    candidateImages.length ? `Candidate image URLs found on the page: ${candidateImages.join(', ')}` : '',
  ].filter(Boolean).join('\n\n');

  return callOpenAiJson(
    BRAND_IDENTITY_EXTRACT_PROMPT,
    userContext,
    undefined,
    0.7,
    ExtractedBrandIdentitySchema,
    undefined,
    'gpt-4o',
  );
}

export async function generateMidjourneyPromptFromImage(imageUrl: string): Promise<string> {
  const result = await callOpenAiVisionJson(IMAGE_PROMPT_VISION_PROMPT, imageUrl, () => mockImagePrompt(), 0.7, ImagePromptSchema);
  return result.prompt;
}
