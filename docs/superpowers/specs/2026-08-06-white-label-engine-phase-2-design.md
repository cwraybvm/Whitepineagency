# White-Label Engine Phase 2: Admin UI & Custom Domain Pipeline — Design

## Context

Phase 1 (merged to master) built the tenant config resolver (`getCurrentTenant()`), `FeatureGuard`,
tenant-driven Tailwind tokens, and sandbox tab gating by `Organization.disabledFeatures`. Nothing
lets a tenant actually change their own colors or feature flags yet — `Organization.accentColor`/
`disabledFeatures` are only ever set via Prisma Studio or direct SQL. Phase 2 adds the self-serve
UI for that, plus a dev-mode debugging aid for tenant resolution.

Investigation found two things that reshape the literal request:
- Every mutation in this app goes through a Next.js API route, fetched client-side (there is one
  Server Action nowhere in the codebase) — including an **existing** `PUT /api/portal/branding`
  route that already handles `logoUrl`/`primaryColor`/`customDomain`. This gets extended, not
  duplicated with a new Server Action.
- That existing route has **zero role enforcement** — `proxy.ts`'s RBAC matrix only covers page
  routes under `/portal`, not `/api/portal/*`, so any authenticated org member (including a
  regular `CLIENT_MEMBER`) can already call it directly today. Since this phase adds a more
  sensitive capability (toggling which studios a tenant's users can access) to that same route,
  the route handler gets its own role check — confirmed with the requester.

## Role gating

`src/proxy.ts`'s `ROUTE_ROLES` array (checked in order, first match wins) gains one entry, placed
**before** the existing `/portal` entry:

```ts
const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['OWNER'] },
  { prefix: '/fulfillment', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/sandbox', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/crm', roles: ['OWNER', 'OPERATOR', 'SALES'] },
  { prefix: '/portal/settings', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER'] },
  { prefix: '/portal', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER', 'CLIENT_MEMBER'] },
];
```

`CLIENT_MEMBER` (a regular team member of a client org) can reach `/portal` but not
`/portal/settings/*` — only the org owner and internal agency staff can change branding/features.
This gates the *page*. The API route below is gated independently, since it's reachable directly.

## `PUT /api/portal/branding` — extend + harden

`src/app/api/portal/branding/route.ts` already validates `primaryColor` against a hex regex and
resolves the org from the `org_id` cookie via `requireOrgId()`. Changes:

- `GET`: add `accentColor: true, disabledFeatures: true` to the existing `select`. No role
  change — stays reachable by any portal role, same as `logoUrl`/`primaryColor`/`customDomain`
  today (viewing current branding/feature state isn't sensitive).
- `PUT`: add a role check as the first thing the handler does, reading the `role` cookie the same
  way `proxy.ts` does:
  ```ts
  const role = (await cookies()).get('role')?.value;
  if (!role || !['OWNER', 'OPERATOR', 'CLIENT_OWNER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```
  Then accept two new body fields:
  - `accentColor` — validated against the same `HEX_COLOR_PATTERN` already used for
    `primaryColor`.
  - `disabledFeatures` — an array; server-side filtered to only values that are actual
    `SandboxTool` keys (`['copy','ad','video','landing-page','campaign','swipe','brand-identity',
    'master-campaign','compliance-audit','direct-mail','blog-post']`) before writing — this is
    untrusted network input, so it's checked against the known key set rather than cast, unlike
    the internal Prisma-row-to-`TenantConfig` cast in `clientConfig.ts` (that one reads
    already-trusted DB data written only through this validated path).

  Both new fields get written via the existing `prisma.organization.update(...)` call, alongside
  the current `logoUrl`/`primaryColor`/`customDomain` fields (unchanged).

## `src/app/(client)/portal/settings/branding/page.tsx` (new)

`'use client'`, matching the existing dashboard's fetch-on-mount pattern
(`portal/dashboard/page.tsx`'s `useEffect` + `fetch('/api/portal/branding')`):

- On mount: `GET /api/portal/branding`, populate local state (`primaryColor`, `accentColor`,
  `disabledFeatures`, plus `logoUrl`/`customDomain` passthrough so a save doesn't clobber them).
- Two `<input type="color">` pickers (native HTML, no picker library) bound to `primaryColor`/
  `accentColor` local state.
- A live preview box (a styled `<div>`) reading directly from local state — updates instantly as
  the pickers change, no server round-trip needed to preview.
- Feature switchboard: one toggle per `SandboxTool` key, 11 entries, labels mirroring
  `sandbox/page.tsx`'s `TABS` array (duplicated as a local `const` in this file — small and
  self-contained enough that importing across two unrelated client pages isn't worth the
  coupling). Toggling adds/removes that key from local `disabledFeatures` state.
- Save button: `PUT`s `{ logoUrl, primaryColor, accentColor, customDomain, disabledFeatures }` to
  `/api/portal/branding`; shows the existing `sonner` toast pattern (already used elsewhere in
  the app, e.g. root `layout.tsx`'s `<Toaster>`) for success/error feedback.

## Dev tenant badge

`src/components/DevTenantBadge.tsx` (new, `'use client'`): a small fixed-position corner badge
showing the resolved tenant's `name`/`slug`, rendered only when
`process.env.NODE_ENV === 'development'`. Takes `tenant: TenantConfig` as a prop (no new context
lookup — both consumers already resolve it server-side).

Added to `src/app/(client)/portal/layout.tsx` and `src/app/(sandbox)/sandbox/layout.tsx` — the
only two layouts that currently call `getCurrentTenant()` (per Phase 1's final-review fix, tenant
resolution was deliberately scoped down from the root layout to just these two, to keep the rest
of the app statically generated). Not added elsewhere — on any other route it would always show
`DEFAULT_TENANT`, which isn't useful debugging information.

## Already handled — verify, don't rebuild

The request asks to "ensure `proxy.ts` gracefully falls back to `DEFAULT_TENANT` ... on
`localhost`." This is already true of the merged Phase 1 code:
- `resolveTenantFromHost()` (`src/proxy.ts`) already returns `{}` (no tenant headers) for
  `hostname === 'localhost'` (and the root domain, and `*.vercel.app`).
- `getCurrentTenant()` (`src/config/clientConfig.ts`) already returns `DEFAULT_TENANT` when no
  `x-tenant-*` header and no resolvable `org_id` cookie match an org.

No code change here — the implementation task is to verify this behavior with a real local dev
request (not assume it from reading the code) and report the result, since the request specifically
asks it be "ensured."

## Explicitly out of scope

- No Server Action — extends the existing API-route convention instead (confirmed with
  requester).
- No admin UI for anything beyond colors + feature toggles (no logo upload, no custom-domain DNS
  verification flow) — nothing asked for those yet.
- No changes to `GET`'s role gating — only `PUT` gets the new check.

## Verification

- `npx tsc --noEmit` and `npm run build` — zero compilation errors (as requested).
- Manual verification of the settings page (color pickers update the preview instantly; save
  persists and a reload reflects it; a `CLIENT_MEMBER`-cookied request to the page gets redirected
  per `proxy.ts`; a direct `curl PUT` without a valid role cookie gets `403`).
- Manual verification of the dev badge (visible in `npm run dev` on `/portal` and `/sandbox`,
  absent in a production build).
- Manual verification of the localhost fallback (a plain `localhost` request resolves to
  `DEFAULT_TENANT`, confirmed via the new dev badge rendering "White Pine Portal" / `default-org`).
