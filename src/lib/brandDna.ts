import type { BrandDna, ExtractedBrandIdentity } from '@/lib/sandboxPrompts';

// Split out of sandboxPrompts.ts: that module's top level imports `prisma`,
// so any client component importing a runtime value from it (not just a
// type) pulls prisma/pg into the client bundle and breaks the build. This
// file has no runtime imports, so it's safe for client components to import
// toBrandDna from directly.

// keyVerbalTracks/activeAdAngles are copy material for a brief, not
// tone/audience override rules — they're deliberately left out of the
// <brand_dna> block and instead flow through the verbal-track insertion
// action in BrandIdentityPanel.
export function toBrandDna(identity: ExtractedBrandIdentity): BrandDna {
  return {
    brandName: identity.brandName || undefined,
    toneOfVoice: identity.brandVoice || undefined,
    targetAudience: identity.targetAudienceProfile || undefined,
    coreValueProp: identity.coreValueProps.length ? identity.coreValueProps.join('; ') : undefined,
  };
}
