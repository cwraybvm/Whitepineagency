'use client';

import React from 'react';
import type { TenantConfig } from '@/config/tenantFeatures';

export default function DevTenantBadge({ tenant }: { tenant: TenantConfig }) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] rounded-md bg-black/80 px-2 py-1 font-mono text-[10px] text-white pointer-events-none">
      tenant: {tenant.name} ({tenant.slug})
    </div>
  );
}
