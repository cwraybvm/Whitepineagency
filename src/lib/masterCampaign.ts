import {
  MASTER_CAMPAIGN_PROMPT,
  callOpenAiJson,
  mockMasterCampaignPackage,
  MasterCampaignPackageSchema,
  type MasterCampaignPackage,
  type BrandDna,
} from '@/lib/sandboxPrompts';

export async function generateMasterCampaign(
  location: string,
  promoOffer: string,
  brandDna?: BrandDna,
): Promise<MasterCampaignPackage> {
  if (!location || !promoOffer) {
    throw new Error('location and promoOffer are required');
  }

  const userContext = `Location: ${location}\nPromo offer: ${promoOffer}`;

  return callOpenAiJson(
    MASTER_CAMPAIGN_PROMPT,
    userContext,
    () => mockMasterCampaignPackage(location, promoOffer),
    0.7,
    MasterCampaignPackageSchema,
    brandDna,
  );
}
