# White-Label Engine (Foundation) — Design

## Context

A "White-Label Engine Setup" request asked for a new `TenantConfig`/`currentTenant` config
layer, a `FeatureGuard` component, a Supabase multi-tenant client, and Tailwind theme wiring.

Investigation found the app already has a working multi-tenant system: `src/proxy.ts` resolves
tenant by subdomain/custom-domain into `x-tenant-slug`/`x-tenant-domain` headers, `Organization`
(Prisma/Postgres) already carries `logoUrl`, `primaryColor`, `customDomain`, `src/lib/portalOrg.ts`
resolves an org from the `org_id` cookie, `src/components/portal/TenantTheme.tsx` sets a
`--portal-primary` CSS var, and `src/lib/gating.ts` does tier-based usage limits. There is no
`@supabase/supabase-js` dependency and no Supabase-session auth anywhere — auth is cookie-based
(`auth_token`/`role`).

This design builds the requested foundation *on* that existing system instead of next to it:
no Supabase client, no second tenant-resolution path, no module-level `currentTenant` singleton
(a singleton would leak between concurrently-served tenants in a shared multi-tenant deployment —
confirmed with the requester, who agreed on a per-request resolver instead).

## Schema changes

`Organization` (`prisma/schema.prisma`) gains two fields, next to the existing whitelabel-branding
block:

```prisma
accentColor      String?  // hex, e.g. "#F59E0B" — second brand color, alongside primaryColor
disabledFeatures String[] @default([])  // FeatureKey values this tenant has turned off
```

`disabledFeatures` is a denylist, not an allowlist: `@default([])` means "nothing disabled," so
every existing org keeps 100% of current behavior post-migration. An allowlist default of `[]`
would have silently locked every tenant out of every feature — the denylist shape avoids that
migration hazard entirely.

Migration: `npx prisma migrate dev --name add_tenant_theme_and_feature_flags`, run against the
configured `DATABASE_URL`/`DIRECT_URL`.

## `src/config/clientConfig.ts` (new)

Server-only module, the single source of truth for "what tenant is this request for."

- `FeatureKey` — type alias for the existing `SandboxTool` type
  (`src/components/sandbox/types.ts`), not a new parallel enum. Sandbox tab ids
  (`'blog-post'`, `'direct-mail'`, `'master-campaign'`, `'video'`, `'ad'`, `'copy'`,
  `'landing-page'`, `'brand-identity'`, `'compliance-audit'`, `'campaign'`, `'swipe'`) are the
  initial gate-able feature set.
- `TenantConfig` interface: `{ id, slug, name, logoUrl, primaryColor, accentColor, customDomain,
  disabledFeatures: FeatureKey[] }`.
- `DEFAULT_TENANT: TenantConfig` — fallback for internal-ops routes (`/admin`, `/crm`,
  `/fulfillment`, `/hub`) and any request where no tenant resolves (e.g. localhost root domain).
  Default brand colors match today's hardcoded values; `disabledFeatures: []`.
- `getCurrentTenant(): Promise<TenantConfig>` — wrapped in `React.cache()` (per-request memo,
  not a module singleton — safe under concurrent requests for different tenants). Resolution
  order: `x-tenant-domain` header → `Organization.customDomain`; else `x-tenant-slug` header →
  `Organization.slug`; else `org_id` cookie via the existing `resolveOrganizationId`
  (`src/lib/portalOrg.ts`); else `DEFAULT_TENANT`. This replaces the tenant-lookup logic
  currently duplicated inline in `portal/layout.tsx`'s `getOrgBranding()` — that function is
  deleted and its two call sites in `portal/layout.tsx` switch to `getCurrentTenant()`.
- `isFeatureEnabled(tenant: TenantConfig, feature: FeatureKey): boolean` —
  `!tenant.disabledFeatures.includes(feature)`.

## `src/components/TenantProvider.tsx` (new)

Client-side React context. Needed because feature-gated UI (sandbox tabs) lives in `'use client'`
components that can't call the server-only `getCurrentTenant()` directly.

- `TenantProvider({ tenant: TenantConfig, children })` — plain context provider, no fetching of
  its own; the tenant is resolved once, server-side, by the caller.
- `useTenant(): TenantConfig` — reads the context. Root `layout.tsx` is the only place that
  resolves `getCurrentTenant()` and wraps `<TenantProvider>`, so every route gets a tenant
  (`DEFAULT_TENANT` on non-tenant routes).

## `src/components/FeatureGuard.tsx` (new)

```tsx
<FeatureGuard feature="blog-post" fallback={<UpgradePrompt />}>
  <BlogPostStudioPanel ... />
</FeatureGuard>
```

Client component, reads `useTenant()`, renders `children` when `isFeatureEnabled` is true,
otherwise `fallback` if given, otherwise `null` (the "hide nav link" case needs no fallback prop).

## Theme wiring

`src/app/layout.tsx` (root, Server Component) calls `getCurrentTenant()` and sets
`--primary-color` / `--accent-color` as inline style on `<body>`, falling back to today's
hardcoded values when the tenant is `DEFAULT_TENANT`. `TenantTheme.tsx` (portal-scoped
`--portal-primary`) is unchanged — it's a narrower, already-working case and not in conflict.

`src/app/globals.css` gains one addition to the existing `@theme` block:

```css
@theme inline {
  --color-primary: var(--primary-color);
  --color-accent: var(--accent-color);
}
```

`@theme inline` (Tailwind v4) lets a theme token point at a runtime CSS custom property instead
of a static value, so `bg-primary` / `text-accent` utility classes become tenant-driven without
any JS-side Tailwind config change.

## Sandbox integration (proves the guard works)

`src/app/(sandbox)/sandbox/page.tsx`'s `TABS` array render is wrapped: tabs whose `id` is in
`useTenant().disabledFeatures` are filtered out of the tab bar, and each panel's render branch
is wrapped in `<FeatureGuard feature={tool}>` as a defense-in-depth check (covers a disabled
feature reached via stale `activeTool` state, not just the nav entry). No other sandbox file
changes — this only touches the tab-list filter and the panel-switch render, matching the file's
existing structure.

## Explicitly out of scope

- **Supabase**: no dependency added, no `src/lib/supabase/client.ts`. The existing Prisma +
  cookie-auth stack already does per-request tenant scoping; adding Supabase would be a second,
  conflicting persistence/auth path. Confirmed with requester.
- **Admin UI** to edit `accentColor` / `disabledFeatures` per org — nothing asked for it yet;
  the columns are editable via Prisma Studio / direct SQL until there's a real request for a UI.
- **Feature gating for non-sandbox routes** (`/admin`, `/crm`, `/fulfillment`) — those are
  internal-ops tools, not part of the client-facing feature set this request is about.

## Verification

- `npx tsc --noEmit` and `npm run build` (as originally requested) — zero compilation errors.
- No test runner is configured in this repo (no jest/vitest, no existing `*.test.*` files), so
  this adds one standalone self-check instead of a framework-based suite:
  `src/config/clientConfig.selfcheck.ts`, run via `npx tsx src/config/clientConfig.selfcheck.ts`,
  asserting `isFeatureEnabled` against a tenant with and without a disabled feature, and that
  `DEFAULT_TENANT.disabledFeatures` is empty.
