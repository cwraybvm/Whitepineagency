import { prisma } from '@/lib/prisma';
import { dispatchWebhookEvent, type WebhookEvent } from '@/lib/webhooks';
import type { CreativeAsset } from '@prisma/client';

// Auto-Fulfillment Engine for the Creative Sandbox — advances a CreativeAsset
// through DRAFT -> STAGED -> PRODUCTION (or -> FAILED) purely on-demand: this
// app runs on Vercel serverless with no persistent process, so there's no
// literal background timer. Instead, any read of an opted-in asset checks
// whether enough time has elapsed since its last transition (`updatedAt`,
// which Prisma bumps automatically) and, if so, applies the next step right
// there. Opt-in only (metadata.autoFulfill), so this never touches assets
// created through the normal manual flow.

const DEFAULT_STEP_DELAY_MS = Number(process.env.SANDBOX_AUTO_STEP_DELAY_MS) || 3000;

type Status = 'DRAFT' | 'STAGED' | 'PRODUCTION' | 'FAILED';

const NEXT_STATUS: Record<Status, Status | null> = {
  DRAFT: 'STAGED',
  STAGED: 'PRODUCTION',
  PRODUCTION: null,
  FAILED: null,
};

const STATUS_EVENT: Partial<Record<Status, WebhookEvent>> = {
  STAGED: 'asset.staged',
  PRODUCTION: 'asset.production',
  FAILED: 'asset.failed',
};

interface AutoFulfillMeta {
  autoFulfill?: boolean;
  autoFulfillStepDelayMs?: number;
  autoFulfillFailAt?: Status;
  autoFulfillWebhookUrl?: string;
  sandboxScenario?: string;
  sandboxRunId?: string;
}

function readMeta(asset: Pick<CreativeAsset, 'metadata'>): AutoFulfillMeta {
  return (asset.metadata as AutoFulfillMeta | null) ?? {};
}

// Manual edits (the real "Promote to Production" button, a title/content
// PATCH) always win — they go through the normal update path untouched by
// this module. This function only ever fires from the lazy on-demand check
// below, never from a user-triggered write.
export async function maybeAdvance(asset: CreativeAsset): Promise<CreativeAsset> {
  const meta = readMeta(asset);
  if (!meta.autoFulfill) return asset;

  const status = asset.status as Status;
  const next = NEXT_STATUS[status];
  if (!next) return asset; // already terminal (PRODUCTION or FAILED)

  const delayMs = meta.autoFulfillStepDelayMs ?? DEFAULT_STEP_DELAY_MS;
  const elapsed = Date.now() - asset.updatedAt.getTime();
  if (elapsed < delayMs) return asset;

  const landedStatus: Status = meta.autoFulfillFailAt === status ? 'FAILED' : next;

  const updated = await prisma.creativeAsset.update({
    where: { id: asset.id },
    data: { status: landedStatus },
  });

  const event = STATUS_EVENT[landedStatus];
  if (event) {
    await dispatchWebhookEvent(
      event,
      { assetId: updated.id, title: updated.title, status: updated.status, sandboxScenario: meta.sandboxScenario ?? null },
      updated.organizationId,
      { sign: true, retry: true, targetUrlOverride: meta.autoFulfillWebhookUrl }
    );
  }

  return updated;
}

export async function maybeAdvanceMany(assets: CreativeAsset[]): Promise<CreativeAsset[]> {
  return Promise.all(assets.map(maybeAdvance));
}
