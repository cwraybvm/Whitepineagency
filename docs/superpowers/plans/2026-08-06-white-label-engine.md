# White-Label Engine (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-request tenant config layer, a `FeatureGuard` component, and tenant-driven
theme CSS variables — built on the app's existing Prisma/`proxy.ts` multi-tenant system, not a
new parallel one.

**Architecture:** `Organization` gains `accentColor` + `disabledFeatures` columns. A new
`src/config/clientConfig.ts` resolves the current request's tenant (subdomain/custom-domain
header, falling back to the `org_id` cookie) into a `TenantConfig`, memoized per-request via
`React.cache()` — never a module-level singleton, since one Next.js server serves many tenants
concurrently. A client-side `TenantProvider`/`useTenant()` context (seeded once, server-side, in
root `layout.tsx`) makes that tenant available to `'use client'` components, and `FeatureGuard`
reads it to hide/replace gated UI. Two existing files that half-duplicate this — `portal/layout.tsx`'s
local `getOrgBranding()` and its hardcoded `--color-primary`/`--color-accent` — are consolidated
onto the new resolver as part of this work.

**Tech Stack:** Next.js (App Router, Server Components), Prisma/Postgres, React `cache()`, Tailwind
v4 (`@theme inline`). No new dependencies.

## Global Constraints

- No Supabase — no `@supabase/supabase-js`, no `src/lib/supabase/`. Confirmed with requester;
  the existing Prisma + cookie-auth stack already does per-request tenant scoping.
- No module-level `currentTenant` singleton — always resolve per-request.
- `disabledFeatures` is a denylist (`@default([])` = nothing disabled) — never invert this to an
  allowlist, that would lock out every existing org on migration.
- `FeatureKey` reuses the existing `SandboxTool` type (`src/components/sandbox/types.ts:1`) — do
  not introduce a second, parallel feature-id enum.
- No test runner is configured in this repo (no jest/vitest, no `*.test.*` files anywhere) — use
  a standalone `assert`-based self-check script run via the already-installed `tsx`, not a new
  framework.
- Verify with `npx tsc --noEmit` after every task that touches `.ts`/`.tsx` files; full
  `npm run build` as the final step.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `Organization.accentColor`, `Organization.disabledFeatures` |
| `src/config/clientConfig.ts` (new) | `FeatureKey`, `TenantConfig`, `DEFAULT_TENANT`, `getCurrentTenant()`, `isFeatureEnabled()` |
| `src/config/clientConfig.selfcheck.ts` (new) | Standalone assert-based check for `isFeatureEnabled` + `DEFAULT_TENANT` |
| `src/components/TenantProvider.tsx` (new) | `TenantProvider` context + `useTenant()` hook |
| `src/components/FeatureGuard.tsx` (new) | `<FeatureGuard feature=... fallback=...>` |
| `src/app/layout.tsx` | Resolve tenant, wrap children in `TenantProvider`, set `--primary-color`/`--accent-color` on `<body>` |
| `src/app/globals.css` | `@theme inline` mapping `--color-primary`/`--color-accent` to those vars |
| `src/app/(client)/portal/layout.tsx` | Delete local `getOrgBranding()`, use `getCurrentTenant()`, stop hardcoding `--color-primary`/`--color-accent` |
| `src/app/(sandbox)/sandbox/page.tsx` | Filter `TABS` by `isFeatureEnabled`, wrap each panel branch in `FeatureGuard` |

---

### Task 1: Schema — `accentColor` + `disabledFeatures`

**Files:**
- Modify: `prisma/schema.prisma` (Organization model, whitelabel-branding block)

**Interfaces:**
- Produces: `Organization.accentColor: string | null`, `Organization.disabledFeatures: string[]`
  (Prisma-generated `PrismaClient` types), consumed by Task 2.

- [ ] **Step 1: Add the two fields**

In `prisma/schema.prisma`, find:

```prisma
  // Whitelabel Branding — applied to the client's own portal view
  logoUrl       String?
  primaryColor  String? // hex, e.g. "#2563EB"
  customDomain  String?
```

Replace with:

```prisma
  // Whitelabel Branding — applied to the client's own portal view
  logoUrl          String?
  primaryColor     String? // hex, e.g. "#2563EB"
  accentColor      String? // hex, e.g. "#F59E0B" — second brand color, alongside primaryColor
  customDomain     String?
  disabledFeatures String[] @default([]) // FeatureKey values (src/config/clientConfig.ts) this tenant has turned off
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_tenant_theme_and_feature_flags`
Expected: migration applies cleanly, Prisma Client regenerates. Existing rows get
`accentColor = NULL`, `disabledFeatures = '{}'` (nothing disabled — no behavior change for any
existing org).

- [ ] **Step 3: Verify the generated client picked up the fields**

Run: `npx tsc --noEmit`
Expected: no errors (nothing references the new fields yet, this just confirms the client
regenerated).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add accentColor and disabledFeatures to Organization"
```

---

### Task 2: `src/config/clientConfig.ts`

**Files:**
- Create: `src/config/clientConfig.ts`
- Create: `src/config/clientConfig.selfcheck.ts`

**Interfaces:**
- Consumes: `prisma` (`@/lib/prisma`, default export `prisma: PrismaClient`),
  `resolveOrganizationId(orgIdCookie: string): Promise<string>` (`@/lib/portalOrg`),
  `SandboxTool` (`@/components/sandbox/types`).
- Produces: `FeatureKey` (= `SandboxTool`), `TenantConfig` interface, `DEFAULT_TENANT: TenantConfig`,
  `getCurrentTenant(): Promise<TenantConfig>`, `isFeatureEnabled(tenant: TenantConfig, feature: FeatureKey): boolean`.
  Consumed by Tasks 3, 4, 5, 6, 7.

- [ ] **Step 1: Write `src/config/clientConfig.ts`**

```ts
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
```

Note: `resolveOrganizationId` auto-creates a "Demo Organization" row when the cookie value
doesn't match an existing `id` or `slug` — that's existing behavior in `portalOrg.ts`, reused
here deliberately so the cookie-fallback path behaves identically everywhere it's used.

- [ ] **Step 2: Write the self-check**

```ts
// src/config/clientConfig.selfcheck.ts
// Run: npx tsx src/config/clientConfig.selfcheck.ts
import assert from 'node:assert';
import { DEFAULT_TENANT, isFeatureEnabled, type TenantConfig } from './clientConfig';

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
```

- [ ] **Step 3: Run the self-check**

Run: `npx tsx src/config/clientConfig.selfcheck.ts`
Expected: prints `clientConfig self-check passed`, exits 0.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/clientConfig.ts src/config/clientConfig.selfcheck.ts
git commit -m "feat: add per-request tenant config resolver"
```

---

### Task 3: `TenantProvider` + `useTenant`

**Files:**
- Create: `src/components/TenantProvider.tsx`

**Interfaces:**
- Consumes: `TenantConfig` (`@/config/clientConfig`).
- Produces: `TenantProvider({ tenant, children })`, `useTenant(): TenantConfig`. Consumed by
  Tasks 4, 5, 7.

- [ ] **Step 1: Write the provider**

```tsx
'use client';

import React, { createContext, useContext } from 'react';
import type { TenantConfig } from '@/config/clientConfig';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return tenant;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (nothing consumes this yet, this checks the file compiles standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/TenantProvider.tsx
git commit -m "feat: add TenantProvider/useTenant client context"
```

---

### Task 4: `FeatureGuard`

**Files:**
- Create: `src/components/FeatureGuard.tsx`

**Interfaces:**
- Consumes: `useTenant()` (`@/components/TenantProvider`), `isFeatureEnabled`, `FeatureKey`
  (`@/config/clientConfig`).
- Produces: `<FeatureGuard feature={FeatureKey} fallback?={ReactNode}>{children}</FeatureGuard>`.
  Consumed by Task 7.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import React from 'react';
import { useTenant } from '@/components/TenantProvider';
import { isFeatureEnabled, type FeatureKey } from '@/config/clientConfig';

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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeatureGuard.tsx
git commit -m "feat: add FeatureGuard component"
```

---

### Task 5: Root layout theme wiring

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css:58` (right after the existing `@theme { ... }` block closes)

**Interfaces:**
- Consumes: `getCurrentTenant()` (`@/config/clientConfig`), `TenantProvider` (`@/components/TenantProvider`).

- [ ] **Step 1: Modify `src/app/layout.tsx`**

Add imports (after the existing `ThemeProvider` import):

```tsx
import { getCurrentTenant } from "@/config/clientConfig";
import { TenantProvider } from "@/components/TenantProvider";
```

Change the component to resolve the tenant and wrap `children`:

```tsx
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body
        className="antialiased bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900"
        style={
          {
            "--primary-color": tenant.primaryColor ?? "#2563EB",
            "--accent-color": tenant.accentColor ?? "#EA580C",
          } as React.CSSProperties
        }
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TenantProvider tenant={tenant}>
            {/* 🔔 SONNER DARK TOAST NOTIFICATIONS */}
            <Toaster
              position="top-center"
              theme="dark"
              richColors
              toastOptions={{
                style: {
                  background: "#090D16",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  borderRadius: "1rem",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.75rem",
                },
              }}
            />

            {children}
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

(Only the `RootLayout` function body changes — `viewport`, `metadata`, and the font/import lines
above it are untouched.)

- [ ] **Step 2: Add the Tailwind theme mapping**

In `src/app/globals.css`, immediately after the existing `@theme { ... }` block's closing `}`
(the one containing `--animate-pulse-glow` and the keyframes) and before the
`/* ====... */` comment that follows it, add:

```css
@theme inline {
  --color-primary: var(--primary-color);
  --color-accent: var(--accent-color);
}
```

This lets Tailwind utilities (`bg-primary`, `text-accent`, etc.) resolve to whatever
`--primary-color`/`--accent-color` are set to by the nearest ancestor — root `layout.tsx` for
every route, or `portal/layout.tsx`'s own `--color-primary`/`--color-accent` override for portal
routes specifically (Task 6).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `http://localhost:3000`, confirm the page renders unchanged (default
colors, since no tenant header/cookie resolves on localhost root). Check dev tools computed
style on `<body>` shows `--primary-color: #2563EB` and `--accent-color: #EA580C`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: inject tenant theme CSS vars in root layout"
```

---

### Task 6: Consolidate `portal/layout.tsx` onto `getCurrentTenant()`

**Files:**
- Modify: `src/app/(client)/portal/layout.tsx`

**Interfaces:**
- Consumes: `getCurrentTenant()` (`@/config/clientConfig`).
- Removes: the local `getOrgBranding()` function and its direct `prisma`/`cookies`/`headers`
  imports (now handled inside `getCurrentTenant()`).

- [ ] **Step 1: Replace the file's data-fetching and render**

Replace the whole file with:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import { getCurrentTenant } from "@/config/clientConfig";
import TenantTheme from "@/components/portal/TenantTheme";

// design-system/white-pine-portal/pages/portal.md — Flat Design, trust-blue, light-mode default.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "White Pine Portal",
  description: "Client Portal",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <div
      className={`${jakarta.variable} ${firaCode.variable} font-sans min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased`}
      style={
        {
          "--color-primary": tenant.primaryColor || "#2563EB",
          "--color-on-primary": "#FFFFFF",
          "--color-secondary": "#3B82F6",
          "--color-accent": tenant.accentColor || "#EA580C",
          "--color-background": "#F8FAFC",
          "--color-foreground": "#1E293B",
          "--color-muted": "#E9EFF8",
          "--color-border": "#E2E8F0",
          "--color-destructive": "#DC2626",
          "--color-ring": "#2563EB",
        } as React.CSSProperties
      }
    >
      <TenantTheme primaryColor={tenant.primaryColor}>
        {tenant.id !== "default" && (
          <div className="border-b border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-foreground)]">
            {tenant.name}
          </div>
        )}
        <main className="min-h-screen">{children}</main>
      </TenantTheme>
    </div>
  );
}
```

`tenant.id !== "default"` replaces the old `orgName &&` check — `DEFAULT_TENANT` always has a
non-null `name`, so without this guard the name bar would render on every unresolved-tenant
request instead of staying hidden the way it did before.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, visit a route under `/portal` (e.g. with the `org_id` cookie set, per existing
demo-auth flow). Confirm the org name bar and brand colors still render exactly as before.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(client)/portal/layout.tsx"
git commit -m "refactor: consolidate portal layout onto getCurrentTenant"
```

---

### Task 7: Sandbox tab gating

**Files:**
- Modify: `src/app/(sandbox)/sandbox/page.tsx`

**Interfaces:**
- Consumes: `useTenant()` (`@/components/TenantProvider`), `isFeatureEnabled`
  (`@/config/clientConfig`), `FeatureGuard` (`@/components/FeatureGuard`).

- [ ] **Step 1: Add imports**

After the existing `import type { BrandDna } from '@/lib/sandboxPrompts';` line, add:

```tsx
import { useTenant } from '@/components/TenantProvider';
import { isFeatureEnabled } from '@/config/clientConfig';
import FeatureGuard from '@/components/FeatureGuard';
```

- [ ] **Step 2: Filter the tab bar**

Inside `export default function SandboxPage() {`, after the existing `useState` declarations,
add:

```tsx
  const tenant = useTenant();
  const visibleTabs = TABS.filter((tab) => isFeatureEnabled(tenant, tab.id));
```

Change the tab-bar render from `{TABS.map((tab) => {` to `{visibleTabs.map((tab) => {` (same
block otherwise — only the source array changes, not the `tab.icon`/`isActive`/`onClick` logic
inside it).

- [ ] **Step 3: Wrap each panel branch in `FeatureGuard`**

Replace the `view === 'draft' ? (<>...</>) : (...)` block with:

```tsx
      {view === 'draft' ? (
        <>
          {activeTool === 'copy' && (
            <FeatureGuard feature="copy">
              <CopyStudioPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'copy' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
              />
            </FeatureGuard>
          )}
          {activeTool === 'ad' && (
            <FeatureGuard feature="ad">
              <AdBuilderPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'ad' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
              />
            </FeatureGuard>
          )}
          {activeTool === 'video' && (
            <FeatureGuard feature="video">
              <VideoLabPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'video' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
              />
            </FeatureGuard>
          )}
          {activeTool === 'landing-page' && (
            <FeatureGuard feature="landing-page">
              <LandingPageStudioPanel />
            </FeatureGuard>
          )}
          {activeTool === 'campaign' && (
            <FeatureGuard feature="campaign">
              <CampaignBatchPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'campaign' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
              />
            </FeatureGuard>
          )}
          {activeTool === 'swipe' && (
            <FeatureGuard feature="swipe">
              <SwipeAnalyzerPanel />
            </FeatureGuard>
          )}
          {activeTool === 'brand-identity' && (
            <FeatureGuard feature="brand-identity">
              <BrandIdentityPanel onApplyBrandDna={setActiveBrandDna} onInsertPhrase={handleInsertPhrase} />
            </FeatureGuard>
          )}
          {activeTool === 'master-campaign' && (
            <FeatureGuard feature="master-campaign">
              <MasterCampaignPanel activeBrandDna={activeBrandDna} onInsertPhrase={handleInsertPhrase} />
            </FeatureGuard>
          )}
          {activeTool === 'compliance-audit' && (
            <FeatureGuard feature="compliance-audit">
              <ComplianceAuditPanel activeBrandDna={activeBrandDna} onInsertPhrase={handleInsertPhrase} />
            </FeatureGuard>
          )}
          {activeTool === 'direct-mail' && (
            <FeatureGuard feature="direct-mail">
              <DirectMailPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'direct-mail' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
                onInsertPhrase={handleInsertPhrase}
              />
            </FeatureGuard>
          )}
          {activeTool === 'blog-post' && (
            <FeatureGuard feature="blog-post">
              <BlogPostStudioPanel
                activeBrandDna={activeBrandDna}
                pendingInsert={pendingInsert?.tool === 'blog-post' ? pendingInsert : null}
                onInsertConsumed={() => setPendingInsert(null)}
                onInsertPhrase={handleInsertPhrase}
              />
            </FeatureGuard>
          )}
        </>
      ) : (
        <StagedAssetsList activeTool={activeTool} />
      )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, visit `/sandbox`. Confirm all 11 tabs still render and switch panels
identically to before (since `Organization.disabledFeatures` is `{}` for every existing org,
nothing is hidden yet). Optionally, set `disabledFeatures = {"blog-post"}` on a test org via
Prisma Studio (`npx prisma studio`) and confirm the "Blog Post Studio" tab disappears from the
tab bar for that tenant.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(sandbox)/sandbox/page.tsx"
git commit -m "feat: gate sandbox studio tabs behind tenant disabledFeatures"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: zero compilation errors, build completes.

- [ ] **Step 3: Re-run the self-check**

Run: `npx tsx src/config/clientConfig.selfcheck.ts`
Expected: `clientConfig self-check passed`.

No commit for this task — it's a checkpoint, not a code change. If either command fails, fix the
issue in the task that introduced it and re-run both commands before moving on.
