import {
  validateExtractBrandUrl,
  BRAND_IDENTITY_EXTRACT_PROMPT,
  callOpenAiJson,
  mockExtractedBrandIdentity,
  ExtractedBrandIdentitySchema,
  type ExtractedBrandIdentity,
} from '@/lib/sandboxPrompts';
import { fetchHtmlWithLimits, stripToPlainText, extractHexColors, extractImageUrls, extractPageTitle, MAX_EXTRACT_CHARS } from '@/lib/htmlExtract';

export async function extractBrandFromUrl(url: string): Promise<ExtractedBrandIdentity> {
  const validationError = validateExtractBrandUrl(url);
  if (validationError) throw new Error(validationError);

  const html = await fetchHtmlWithLimits(url);

  const title = extractPageTitle(html);
  const pageText = stripToPlainText(html).slice(0, MAX_EXTRACT_CHARS);
  const candidateColors = extractHexColors(html);
  const candidateImages = extractImageUrls(html, url);

  const userContext = [
    title && `Page title: ${title}`,
    `Page text extracted from ${url}:`,
    pageText,
    candidateColors.length ? `Candidate hex colors found in the page's CSS: ${candidateColors.join(', ')}` : '',
    candidateImages.length ? `Candidate image URLs found on the page: ${candidateImages.join(', ')}` : '',
  ].filter(Boolean).join('\n\n');

  return callOpenAiJson(
    BRAND_IDENTITY_EXTRACT_PROMPT,
    userContext,
    () => mockExtractedBrandIdentity(url),
    0.7,
    ExtractedBrandIdentitySchema,
  );
}
