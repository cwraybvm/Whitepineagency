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

// Single source of truth for both the branding API route's server-side validation
// and the settings page's feature switchboard — order matches sandbox/page.tsx's TABS.
export const FEATURE_KEYS: FeatureKey[] = [
  'copy',
  'ad',
  'video',
  'landing-page',
  'campaign',
  'swipe',
  'brand-identity',
  'master-campaign',
  'compliance-audit',
  'direct-mail',
  'blog-post',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  copy: 'Copy Studio',
  ad: 'Ad Builder',
  video: 'Video Lab',
  'landing-page': 'Landing Page Studio',
  campaign: 'Campaign Engine',
  swipe: 'Ad Swipe File',
  'brand-identity': 'Brand Identity',
  'master-campaign': '30-Day Campaign',
  'compliance-audit': 'Policy & Competitor Audit',
  'direct-mail': 'Direct Mail Studio',
  'blog-post': 'Blog Post Studio',
};
