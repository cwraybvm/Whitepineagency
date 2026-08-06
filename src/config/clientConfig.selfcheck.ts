// src/config/clientConfig.selfcheck.ts
// Run: npx tsx src/config/clientConfig.selfcheck.ts
import assert from 'node:assert';
import { DEFAULT_TENANT, isFeatureEnabled, type TenantConfig } from './tenantFeatures';

assert.strictEqual(
  DEFAULT_TENANT.disabledFeatures.length,
  0,
  'DEFAULT_TENANT must have no disabled features (denylist default)'
);

const tenantWithBlogDisabled: TenantConfig = {
  ...DEFAULT_TENANT,
  disabledFeatures: ['blog-post'],
};

assert.strictEqual(
  isFeatureEnabled(tenantWithBlogDisabled, 'blog-post'),
  false,
  'blog-post should be disabled'
);
assert.strictEqual(
  isFeatureEnabled(tenantWithBlogDisabled, 'direct-mail'),
  true,
  'direct-mail should stay enabled when only blog-post is disabled'
);
assert.strictEqual(
  isFeatureEnabled(DEFAULT_TENANT, 'blog-post'),
  true,
  'DEFAULT_TENANT should have every feature enabled'
);

console.log('clientConfig self-check passed');
