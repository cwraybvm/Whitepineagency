import type { SandboxTool } from '@/components/sandbox/types';

// Client-safe tenant/feature types + helpers. Kept separate from clientConfig.ts
// (which pulls in next/headers + prisma for getCurrentTenant) so Client Components
// like FeatureGuard can import isFeatureEnabled without bundling server-only code.
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

export function isFeatureEnabled(tenant: TenantConfig, feature: FeatureKey): boolean {
  return !tenant.disabledFeatures.includes(feature);
}
