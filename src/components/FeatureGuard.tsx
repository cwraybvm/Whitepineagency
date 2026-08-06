'use client';

import React from 'react';
import { useTenant } from '@/components/TenantProvider';
import { isFeatureEnabled, type FeatureKey } from '@/config/tenantFeatures';

interface FeatureGuardProps {
  feature: FeatureKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function FeatureGuard({ feature, fallback = null, children }: FeatureGuardProps) {
  const tenant = useTenant();
  if (!isFeatureEnabled(tenant, feature)) return <>{fallback}</>;
  return <>{children}</>;
}
