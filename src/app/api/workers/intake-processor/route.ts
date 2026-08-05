import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandFromUrl } from '@/lib/brandExtractor';
import { toBrandDna, type BrandDna, type MasterCampaignPackage } from '@/lib/sandboxPrompts';
import { generateMasterCampaign } from '@/lib/masterCampaign';
import { pushToCrmWebhook } from '@/lib/crmSync';

// Async intake worker — offloads brand extraction + campaign generation off
// the /api/drive request path (fired via `after()`, not awaited by callers)
// and pushes the enriched result to the CRM once done. Status is written
// back onto the originating IntakeAsset row so the portal can poll it.
export async function POST(req: NextRequest) {
  const { clientName, websiteUrl, location, offerDetails, intakeAssetId } = await req.json();

  let brandDna: BrandDna | undefined;
  let errorMessage: string | undefined;

  if (websiteUrl) {
    try {
      brandDna = toBrandDna(await extractBrandFromUrl(websiteUrl));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Intake worker: brand extraction failed:', error);
    }
  }

  let campaignPackage: MasterCampaignPackage | null = null;
  if (location && offerDetails) {
    try {
      campaignPackage = await generateMasterCampaign(location, offerDetails, brandDna);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Intake worker: campaign generation failed:', error);
    }
  }

  if (intakeAssetId) {
    await prisma.intakeAsset
      .update({
        where: { id: intakeAssetId },
        data: { status: errorMessage ? 'FAILED' : 'COMPLETE', errorMessage },
      })
      .catch((dbError) => console.error('Intake worker: status update failed:', dbError));
  }

  await pushToCrmWebhook({
    event: 'intake.enriched',
    clientName,
    websiteUrl,
    location,
    offerDetails,
    brandDna,
    campaignPackage,
  });

  return NextResponse.json({ success: true, brandDna, campaignPackage });
}
