import { db } from './db';

// 🛡️ Define your standard SaaS usage tier limits
export const TIER_LIMITS = {
  FREE: { maxAudits: 5, maxLeads: 25 },
  PRO: { maxAudits: 100, maxLeads: 1000 },
  ENTERPRISE: { maxAudits: Infinity, maxLeads: Infinity }
};

interface GatingCheck {
  allowed: boolean;
  currentCount: number;
  limit: number;
}

/**
 * Checks if a specific organization has reached its monthly/total audit limits
 */
export async function checkAuditLimit(organizationId: string): Promise<GatingCheck> {
  // 1. Fetch the organization's current status/tier
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { status: true } // Let's use your status field as a proxy for tier, or assume 'FREE' for now
  });

  // Default to FREE tier limits unless their status explicitly says otherwise
  const tier = (organization?.status === 'PRO' || organization?.status === 'ACTIVE') ? 'FREE' : 'FREE';
  const limit = TIER_LIMITS[tier].maxAudits;

  // 2. Aggregate the number of existing audits for this workspace
  const currentCount = await db.auditRun.count({
    where: { organizationId }
  });

  return {
    allowed: currentCount < limit,
    currentCount,
    limit
  };
}