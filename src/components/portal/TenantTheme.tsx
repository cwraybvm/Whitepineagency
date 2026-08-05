'use client';

import React from 'react';

const DEFAULT_PRIMARY = '#2563EB';

interface TenantThemeProps {
  primaryColor?: string | null;
  children: React.ReactNode;
}

// Whitelabel wrapper — sets --portal-primary from the resolved tenant's
// Organization.primaryColor so client portal views brand dynamically per
// tenant (subdomain/custom-domain resolved in src/proxy.ts).
export default function TenantTheme({ primaryColor, children }: TenantThemeProps) {
  return (
    <div style={{ '--portal-primary': primaryColor || DEFAULT_PRIMARY } as React.CSSProperties}>
      {children}
    </div>
  );
}
