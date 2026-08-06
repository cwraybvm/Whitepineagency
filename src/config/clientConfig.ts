import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';
import type { SandboxTool } from '@/components/sandbox/types';

export type FeatureKey = SandboxTool;

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  disabledFeatures: FeatureKey[];
}

export const DEFAULT_TENANT: TenantConfig = {
  id: 'default',
  slug: 'default-org',
  name: 'White Pine Portal',
  logoUrl: null,
  primaryColor: '#2563EB',
  accentColor: '#EA580C',
  customDomain: null,
  disabledFeatures: [],
};

const TENANT_SELECT = {
  id: true,
  slug: true,
  name: true,
  logoUrl: true,
  primaryColor: true,
  accentColor: true,
  customDomain: true,
  disabledFeatures: true,
} as const;

type OrgRow = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  disabledFeatures: string[];
};

function toTenantConfig(org: OrgRow): TenantConfig {
  return { ...org, disabledFeatures: org.disabledFeatures as FeatureKey[] };
}

// Resolves the tenant by host first (x-tenant-slug/x-tenant-domain, set in src/proxy.ts from the
// request's subdomain or custom domain), falling back to the org_id cookie used by the internal
// app/demo-auth flow. React.cache() memoizes this per-request — NOT a module singleton, so
// concurrent requests for different tenants never see each other's result.
export const getCurrentTenant = cache(async (): Promise<TenantConfig> => {
  const headerStore = await headers();
  const tenantDomain = headerStore.get('x-tenant-domain');
  const tenantSlug = headerStore.get('x-tenant-slug');

  if (tenantDomain) {
    const byDomain = await prisma.organization
      .findFirst({ where: { customDomain: tenantDomain }, select: TENANT_SELECT })
      .catch(() => null);
    if (byDomain) return toTenantConfig(byDomain);
  }

  if (tenantSlug) {
    const bySubdomain = await prisma.organization
      .findUnique({ where: { slug: tenantSlug }, select: TENANT_SELECT })
      .catch(() => null);
    if (bySubdomain) return toTenantConfig(bySubdomain);
  }

  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) return DEFAULT_TENANT;

  const resolvedId = await resolveOrganizationId(orgIdCookie).catch(() => null);
  if (!resolvedId) return DEFAULT_TENANT;

  const org = await prisma.organization
    .findUnique({ where: { id: resolvedId }, select: TENANT_SELECT })
    .catch(() => null);
  return org ? toTenantConfig(org) : DEFAULT_TENANT;
});

export function isFeatureEnabled(tenant: TenantConfig, feature: FeatureKey): boolean {
  return !tenant.disabledFeatures.includes(feature);
}
