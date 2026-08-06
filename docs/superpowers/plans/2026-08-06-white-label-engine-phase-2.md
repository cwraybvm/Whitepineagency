# White-Label Engine Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-serve tenant admin UI for branding colors + feature toggles, a dev-mode tenant
debugging badge, and closing a pre-existing role-enforcement gap on the branding API route.

**Architecture:** Extend the existing `PUT /api/portal/branding` route (not a new Server Action —
this codebase has none) to accept `accentColor`/`disabledFeatures`, with a new server-side role
check since that route has none today. A new `'use client'` settings page under
`/portal/settings/branding`, gated at the page level via a new `proxy.ts` RBAC entry, drives that
route the same way the existing portal dashboard already fetches `/api/portal/branding`. A small
dev-only badge surfaces `getCurrentTenant()`'s result in the two layouts that already resolve it.

**Tech Stack:** Next.js (App Router), Prisma, `sonner` (toast, already globally mounted in root
layout), native `<input type="color">` (no picker library).

## Global Constraints

- No Server Action anywhere — extend the existing API-route convention (confirmed with
  requester).
- `PUT /api/portal/branding` must reject (403) any request whose `role` cookie is not one of
  `OWNER`, `OPERATOR`, `CLIENT_OWNER` — this route currently has zero role enforcement and is
  reachable directly regardless of page-level gating.
- `GET /api/portal/branding` keeps its current (no role check) behavior — only `PUT` changes.
- `disabledFeatures` from the request body must be filtered against the known `FeatureKey` set
  before writing — untrusted network input, never trust-cast.
- `/portal/settings` (and everything under it) requires role `OWNER`, `OPERATOR`, or
  `CLIENT_OWNER` in `src/proxy.ts`'s `ROUTE_ROLES` — `CLIENT_MEMBER` can reach `/portal` but not
  `/portal/settings/*`.
- The dev tenant badge renders only when `process.env.NODE_ENV === 'development'`.
- Verify with `npx tsc --noEmit` after every task that touches `.ts`/`.tsx` files; full
  `npm run build` as the final step.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/proxy.ts` | New `/portal/settings` RBAC entry |
| `src/config/tenantFeatures.ts` | Gains `FEATURE_KEYS` (runtime array) + `FEATURE_LABELS` (display names) — single source of truth for both the API route's validation and the settings page's switchboard |
| `src/app/api/portal/branding/route.ts` | `GET` returns `accentColor`/`disabledFeatures`; `PUT` gains role check + validates/persists both |
| `src/app/(client)/portal/settings/branding/page.tsx` (new) | Color pickers + live preview + feature switchboard + save |
| `src/components/DevTenantBadge.tsx` (new) | Dev-only tenant debug badge |
| `src/app/(client)/portal/layout.tsx` | Renders `DevTenantBadge` |
| `src/app/(sandbox)/sandbox/layout.tsx` | Renders `DevTenantBadge` |

---

### Task 1: `proxy.ts` — `/portal/settings` role gate

**Files:**
- Modify: `src/proxy.ts:8-14` (`ROUTE_ROLES` array)

**Interfaces:**
- No new exports — internal middleware config only.

- [ ] **Step 1: Add the route-role entry**

In `src/proxy.ts`, find:

```ts
const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['OWNER'] },
  { prefix: '/fulfillment', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/sandbox', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/crm', roles: ['OWNER', 'OPERATOR', 'SALES'] },
  { prefix: '/portal', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER', 'CLIENT_MEMBER'] },
];
```

Replace with (new entry inserted **before** `/portal` — array is checked in order, first match
wins, so the more specific prefix must come first):

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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. In another terminal:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -b "auth_token=t; role=CLIENT_MEMBER; org_id=demo-apex-plumbing" \
  http://localhost:3000/portal/settings/branding
```

Expected: `307` (or `308`) redirecting to `/access-denied?...` (the page doesn't exist yet, but
the RBAC check runs before routing resolves the page — a redirect to `/access-denied` proves the
role gate works; a 404 would mean the gate isn't being hit yet, worth investigating before moving
on).

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -b "auth_token=t; role=CLIENT_OWNER; org_id=demo-apex-plumbing" \
  http://localhost:3000/portal/settings/branding
```

Expected: `404` (role passes the gate; the page itself doesn't exist until Task 3 — a 404 here,
vs. a redirect for the `CLIENT_MEMBER` case above, is the proof the gate is role-sensitive).

Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: gate /portal/settings to OWNER/OPERATOR/CLIENT_OWNER"
```

---

### Task 2: `src/config/tenantFeatures.ts` — shared feature key list + labels

**Files:**
- Modify: `src/config/tenantFeatures.ts`

**Interfaces:**
- Consumes: existing `FeatureKey` type (already in this file).
- Produces: `FEATURE_KEYS: FeatureKey[]`, `FEATURE_LABELS: Record<FeatureKey, string>`. Consumed
  by Task 3 (API route validation) and Task 4 (settings page switchboard).

- [ ] **Step 1: Add the two exports**

Append to `src/config/tenantFeatures.ts` (after the existing `isFeatureEnabled` function):

```ts
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
```

(Labels copied verbatim from `src/app/(sandbox)/sandbox/page.tsx`'s `TABS` array — keep them in
sync if that file's labels ever change, though nothing automated enforces that today.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/config/tenantFeatures.ts
git commit -m "feat: add FEATURE_KEYS/FEATURE_LABELS to tenantFeatures"
```

---

### Task 3: Extend `PUT /api/portal/branding` — role check + accentColor + disabledFeatures

**Files:**
- Modify: `src/app/api/portal/branding/route.ts`

**Interfaces:**
- Consumes: `FEATURE_KEYS` (`@/config/tenantFeatures`), `cookies` (`next/headers`, already
  imported in this file).
- Produces: no new exports — `GET`/`PUT` response shape gains `accentColor`, `disabledFeatures`.

- [ ] **Step 1: Replace the file**

Replace `src/app/api/portal/branding/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';
import { FEATURE_KEYS } from '@/config/tenantFeatures';

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_PUT_ROLES = ['OWNER', 'OPERATOR', 'CLIENT_OWNER'];

async function requireOrgId() {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) return null;
  return resolveOrganizationId(orgIdCookie);
}

export async function GET() {
  const organizationId = await requireOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      customDomain: true,
      disabledFeatures: true,
    },
  });

  return NextResponse.json(org || {}, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const role = (await cookies()).get('role')?.value;
  if (!role || !ALLOWED_PUT_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const organizationId = await requireOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  try {
    const { logoUrl, primaryColor, accentColor, customDomain, disabledFeatures } = await request.json();

    if (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor)) {
      return NextResponse.json({ error: 'primaryColor must be a hex value like #2563EB' }, { status: 400 });
    }
    if (accentColor && !HEX_COLOR_PATTERN.test(accentColor)) {
      return NextResponse.json({ error: 'accentColor must be a hex value like #EA580C' }, { status: 400 });
    }
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      return NextResponse.json({ error: 'logoUrl must be a valid http(s) URL' }, { status: 400 });
    }

    const validatedDisabledFeatures = Array.isArray(disabledFeatures)
      ? disabledFeatures.filter((f): f is string => FEATURE_KEYS.includes(f))
      : [];

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        accentColor: accentColor || null,
        customDomain: customDomain || null,
        disabledFeatures: validatedDisabledFeatures,
      },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        disabledFeatures: true,
      },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error('Branding update failed:', error);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. In another terminal (adjust `org_id` to a real seeded org slug if
`demo-apex-plumbing` isn't present — `resolveOrganizationId` auto-creates one from the slug on
first use, so this should work regardless):

```bash
# Forbidden role
curl -s -o /dev/null -w "%{http_code}\n" -X PUT \
  -b "auth_token=t; role=CLIENT_MEMBER; org_id=demo-apex-plumbing" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor":"#111111"}' \
  http://localhost:3000/api/portal/branding
# Expected: 403

# Allowed role, valid payload
curl -s -X PUT \
  -b "auth_token=t; role=CLIENT_OWNER; org_id=demo-apex-plumbing" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor":"#111111","accentColor":"#222222","disabledFeatures":["blog-post","not-a-real-key"]}' \
  http://localhost:3000/api/portal/branding
# Expected: 200, JSON body with primaryColor "#111111", accentColor "#222222",
# disabledFeatures ["blog-post"] (the invalid "not-a-real-key" entry filtered out)

# Confirm GET reflects it
curl -s \
  -b "auth_token=t; role=CLIENT_OWNER; org_id=demo-apex-plumbing" \
  http://localhost:3000/api/portal/branding
# Expected: 200, same accentColor/disabledFeatures values
```

Stop the dev server after. Report the actual response bodies in your report.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/portal/branding/route.ts
git commit -m "feat: add role check and accentColor/disabledFeatures to branding API"
```

---

### Task 4: Settings page — `/portal/settings/branding`

**Files:**
- Create: `src/app/(client)/portal/settings/branding/page.tsx`

**Interfaces:**
- Consumes: `GET`/`PUT /api/portal/branding` (Task 3), `FEATURE_KEYS`/`FEATURE_LABELS`
  (`@/config/tenantFeatures`, Task 2), `toast` (`sonner`, already globally mounted — see
  `src/app/(client)/portal/reviews/page.tsx` for the existing usage pattern in this same route
  group: `import { toast } from 'sonner'; toast.error('message')`).
- Produces: the `/portal/settings/branding` page. No other file imports this (it's a route leaf).

- [ ] **Step 1: Write the page**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FEATURE_KEYS, FEATURE_LABELS } from '@/config/tenantFeatures';
import type { FeatureKey } from '@/config/tenantFeatures';

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  disabledFeatures: FeatureKey[];
}

const DEFAULT_PRIMARY = '#2563EB';
const DEFAULT_ACCENT = '#EA580C';

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [disabledFeatures, setDisabledFeatures] = useState<FeatureKey[]>([]);

  useEffect(() => {
    fetch('/api/portal/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<Branding> | null) => {
        if (!data) return;
        setLogoUrl(data.logoUrl ?? null);
        setCustomDomain(data.customDomain ?? null);
        setPrimaryColor(data.primaryColor || DEFAULT_PRIMARY);
        setAccentColor(data.accentColor || DEFAULT_ACCENT);
        setDisabledFeatures(data.disabledFeatures ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleFeature(feature: FeatureKey) {
    setDisabledFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl, primaryColor, accentColor, customDomain, disabledFeatures }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      toast.success('Branding updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-[var(--color-foreground)]">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">Branding & Features</h1>
        <p className="text-sm text-[var(--color-foreground)]/70">
          Colors and studio access for your portal.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Colors</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            Primary
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-14 rounded border border-[var(--color-border)]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            Accent
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-14 rounded border border-[var(--color-border)]"
            />
          </label>
        </div>

        <div
          className="rounded-xl border border-[var(--color-border)] p-4"
          style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
        >
          <p className="text-sm font-medium">Preview</p>
          <button
            type="button"
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
          >
            Accent Button
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Studio Access</h2>
        <div className="space-y-2">
          {FEATURE_KEYS.map((feature) => (
            <label
              key={feature}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {FEATURE_LABELS[feature]}
              <input
                type="checkbox"
                checked={!disabledFeatures.includes(feature)}
                onChange={() => toggleFeature(feature)}
              />
            </label>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Visit `http://localhost:3000/portal/settings/branding` with a `CLIENT_OWNER`
(or `OWNER`/`OPERATOR`) role cookie set (use the browser directly, or curl with `-L` to follow the
`/api/auth/demo` redirect first — note `/api/auth/demo` sets `role=CLIENT_OWNER`, which passes
this gate). Confirm: the page loads current branding, changing a color picker updates the preview
box instantly (no network request until Save), toggling a feature checkbox works, clicking Save
shows a success toast and a page reload reflects the saved values. Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(client)/portal/settings/branding/page.tsx"
git commit -m "feat: add tenant branding and feature settings page"
```

---

### Task 5: Dev tenant badge

**Files:**
- Create: `src/components/DevTenantBadge.tsx`
- Modify: `src/app/(client)/portal/layout.tsx`
- Modify: `src/app/(sandbox)/sandbox/layout.tsx`

**Interfaces:**
- Consumes: `TenantConfig` (`@/config/tenantFeatures`).
- Produces: `<DevTenantBadge tenant={TenantConfig} />`.

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Wire into `portal/layout.tsx`**

In `src/app/(client)/portal/layout.tsx`, add the import:

```tsx
import DevTenantBadge from "@/components/DevTenantBadge";
```

Add `<DevTenantBadge tenant={tenant} />` as the last child inside the outer `<div>`, after the
closing `</TenantProvider>` tag (sibling to it, not nested inside — the badge doesn't need
`useTenant()`, it receives `tenant` directly as a prop):

```tsx
    <div ...>
      <TenantProvider tenant={tenant}>
        ...
      </TenantProvider>
      <DevTenantBadge tenant={tenant} />
    </div>
```

- [ ] **Step 3: Wire into `sandbox/layout.tsx`**

`TenantProvider` is currently the outermost element this file returns (it wraps the
`admin-console` div directly, with nothing above it). Add the import:

```tsx
import DevTenantBadge from "@/components/DevTenantBadge";
```

Change the `return` from:

```tsx
  return (
    <TenantProvider tenant={tenant}>
      <div className={`admin-console ...`} style={{...}}>
        ...
      </div>
    </TenantProvider>
  );
```

to (wrap in a fragment so `DevTenantBadge` is a sibling to `TenantProvider`, not nested inside
it):

```tsx
  return (
    <>
      <TenantProvider tenant={tenant}>
        <div className={`admin-console ...`} style={{...}}>
          ...
        </div>
      </TenantProvider>
      <DevTenantBadge tenant={tenant} />
    </>
  );
```

(`...` above stands for the div's actual existing className/style/children — unchanged, only the
outer wrapping changes from `TenantProvider` directly to a fragment containing `TenantProvider`
plus the new badge.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev` (dev mode — `NODE_ENV` is `development` automatically). Visit `/portal` and
`/sandbox` (with valid role cookies per earlier tasks), confirm the badge renders in the
bottom-right corner showing tenant name/slug. Then run `npm run build && npm run start` in a
separate check and confirm the badge does NOT appear (production build,
`NODE_ENV === 'production'`). Stop both servers after.

- [ ] **Step 6: Commit**

```bash
git add src/components/DevTenantBadge.tsx "src/app/(client)/portal/layout.tsx" "src/app/(sandbox)/sandbox/layout.tsx"
git commit -m "feat: add dev-only tenant debug badge to portal and sandbox layouts"
```

---

### Task 6: Verify localhost → DEFAULT_TENANT fallback (no code change expected)

**Files:** none expected — this task verifies existing Phase 1 behavior, per the spec's
"already handled, verify don't rebuild" section. If verification finds a real gap, stop and
report it rather than silently patching — this task exists to confirm the request's literal
"ensure ... falls back to DEFAULT_TENANT" ask is actually true, since the spec's investigation
only reasoned about it from reading the code, not from an actual request.

- [ ] **Step 1: Verify via the dev badge**

Run `npm run dev`. Visit `http://localhost:3000/portal` and `http://localhost:3000/sandbox` with
**no** `org_id` cookie set at all (a fresh browser profile, or `curl` with no `-b` flag — for the
page routes you'll need valid `auth_token`/`role` cookies to pass RBAC, but deliberately omit
`org_id`). Confirm the `DevTenantBadge` (Task 5) shows `White Pine Portal (default-org)` —
`DEFAULT_TENANT`'s exact `name`/`slug` from `src/config/tenantFeatures.ts` — proving
`resolveTenantFromHost()` returning `{}` for `localhost` plus `getCurrentTenant()`'s no-cookie
fallback actually produces `DEFAULT_TENANT` end to end, not just in isolated code reading.

- [ ] **Step 2: Report findings**

Write the actual observed result (badge text, any errors) in your report. Stop the dev server
after.

- [ ] **Step 3: No commit** (verification only — unless a real gap was found and fixed, in which
  case commit that fix with a message describing the actual bug, and flag it prominently in your
  report since it means the spec's "already handled" claim was wrong).

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: zero compilation errors, build completes.

No commit for this task — it's a checkpoint. If either command fails, fix the issue in the task
that introduced it and re-run both commands before moving on.
