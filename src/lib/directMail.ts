import {
  DIRECT_MAIL_PROMPT,
  callOpenAiJson,
  mockDirectMailPackage,
  DirectMailPackageSchema,
  type DirectMailPackage,
  type FormFactor,
  type BrandDna,
} from '@/lib/sandboxPrompts';

export async function generateDirectMailPackage(
  briefText: string,
  formFactor: FormFactor,
  audiences: string[],
  qrUrl: string,
  brandDna?: BrandDna,
): Promise<DirectMailPackage> {
  const userContext = [
    `Form factor: ${formFactor === 'postcard' ? '4x6 postcard (front/back)' : '8.5x11 letter'}`,
    `QR code destination: ${qrUrl}`,
    `Target audiences (write one variant per audience, in this order): ${audiences.join(', ')}`,
    'Brief:',
    briefText,
  ].join('\n\n');

  return callOpenAiJson(
    DIRECT_MAIL_PROMPT,
    userContext,
    () => mockDirectMailPackage(briefText, formFactor, audiences, qrUrl),
    0.7,
    DirectMailPackageSchema,
    brandDna,
  );
}
