# Creative Assets Dashboard Theme Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a site-wide dark/light theme toggle and restyle the sandbox's Staged Assets feature into a themeable component tree with grid/list views and a filter sidebar.

**Architecture:** `next-themes` wraps the app at root layout using Tailwind v4's existing class-based dark variant (no Tailwind config changes). `StagedAssetsList.tsx` becomes a thin orchestrator around five new components: `AssetsSidebar`, `BulkActionBar`, `AssetListRow`, `AssetCard`, `SkeletonLoader`, plus a standalone `ThemeToggle` mounted in `AdminNav`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, `next-themes`, `lucide-react` icons, `sonner` toasts. No test runner is configured in this repo — verification is `npx tsc --noEmit` per task plus manual dev-server checks for UI behavior, per the spec's Testing section.

## Global Constraints

- Reskin the existing sandbox Staged Assets feature (`CreativeAsset` type, `/api/sandbox/assets` API) — no new page, no new data model.
- Theme toggle is site-wide via root layout `ThemeProvider`; only the Assets subtree gets full light-mode styling this pass.
- Status badges map only to real statuses: `STAGED` → "READY" styling, `PRODUCTION` → "ACTIVE" styling. No DRAFT/REVIEW states added.
- Type badges map to real `CreativeAsset.type` values: `COPY`, `AD`, `VIDEO_SCRIPT` (→ VIDEO styling), `LANDING_PAGE` (→ LANDING styling), `DEFAULT` fallback.
- Selected-card wash: light `bg-[#F0FDF4] border-[#059669]`, dark `dark:bg-emerald-950/40 dark:border-emerald-500`.
- Glass surface: light `bg-white/85 border-white/60 backdrop-blur-md shadow-sm`, dark `dark:bg-slate-900/70 dark:border-slate-800/80 dark:backdrop-blur-md dark:shadow-2xl`.
- Text hierarchy: light `text-slate-900` / `text-slate-500`, dark `dark:text-slate-100` / `dark:text-slate-400`.
- No org filter, no new lifecycle statuses, no theming of routes outside the Assets subtree — out of scope per spec.

---

### Task 1: Install next-themes and wire site-wide ThemeProvider

**Files:**
- Modify: `package.json` (add `next-themes` dependency)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `<ThemeProvider>` wraps `{children}` in root layout, `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`. Later tasks' `useTheme()` calls rely on this being mounted.

- [ ] **Step 1: Install the dependency**

Run: `npm install next-themes`

- [ ] **Step 2: Update root layout**

Edit `src/app/layout.tsx`. Remove the hardcoded `"dark"` class from `<html>` and wrap the body content in `ThemeProvider`:

```tsx
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// ─── NEXT.JS 14+ VIEWPORT CONFIGURATION ───
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0F17",
};

// ─── ROOT METADATA ───
export const metadata: Metadata = {
  title: "White Pine Portal",
  description: "Lead Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "White Pine Portal",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="antialiased bg-[#0B0F17] dark:bg-[#0B0F17] text-gray-200">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is required by `next-themes` because it sets the `class` attribute client-side before hydration.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, load any page. Confirm it still renders dark (default theme is `"dark"`, unchanged visual baseline).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "feat: wire next-themes ThemeProvider at root layout"
```

---

### Task 2: ThemeToggle component, mounted in AdminNav

**Files:**
- Create: `src/components/sandbox/ThemeToggle.tsx`
- Modify: `src/components/AdminNav.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `next-themes` (from Task 1's `ThemeProvider`).
- Produces: `export default function ThemeToggle(): JSX.Element` — no props. Later tasks don't depend on this directly; it's mounted once in `AdminNav`.

- [ ] **Step 1: Create ThemeToggle**

```tsx
// src/components/sandbox/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg border border-transparent" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5 transition-all"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
```

The `mounted` guard avoids a hydration mismatch: `resolvedTheme` is only known client-side.

- [ ] **Step 2: Mount it in AdminNav**

Edit `src/components/AdminNav.tsx`. Add the import and place the toggle next to the "WHITE PINE" wordmark in the desktop sidebar header:

```tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/sandbox/ThemeToggle";
```

```tsx
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center border border-white/10 overflow-hidden">
              <img src="/logo.jpg" alt="White Pine" className="max-w-full max-h-full object-contain" />
            </div>
            <span className="font-black tracking-tight text-white text-sm flex-1">WHITE PINE</span>
            <ThemeToggle />
          </div>
```

(Replace the existing header `div` — same three lines plus the new `flex-1` on the span and the `<ThemeToggle />` line.)

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual check**

`npm run dev`, open `/admin`. Click the toggle — page should switch between light and dark (most of the app has no light-mode classes yet, so expect it to look unstyled/wrong in light mode outside AdminNav itself — that's expected until later tasks theme the Assets subtree). Click again to confirm it toggles back.

- [ ] **Step 5: Commit**

```bash
git add src/components/sandbox/ThemeToggle.tsx src/components/AdminNav.tsx
git commit -m "feat: add ThemeToggle component to AdminNav"
```

---

### Task 3: Asset badge style maps

**Files:**
- Create: `src/components/sandbox/assetBadgeStyles.ts`

**Interfaces:**
- Produces:
  - `TYPE_BADGE_STYLES: Record<string, string>` — keys `'AD' | 'VIDEO_SCRIPT' | 'COPY' | 'LANDING_PAGE' | 'DEFAULT'`.
  - `STATUS_BADGE_STYLES: Record<'STAGED' | 'PRODUCTION', { container: string; dot: string; label: string }>`.
  - Both consumed by `AssetCard` (Task 6) and `AssetListRow` (Task 7).

- [ ] **Step 1: Create the file**

```ts
// src/components/sandbox/assetBadgeStyles.ts

export const TYPE_BADGE_STYLES: Record<string, string> = {
  AD: 'bg-[#1A3C34] text-white dark:bg-emerald-950 dark:text-emerald-200 dark:border dark:border-emerald-800/50',
  VIDEO_SCRIPT: 'bg-[#0F766E] text-white dark:bg-teal-950 dark:text-teal-200 dark:border dark:border-teal-800/50',
  COPY: 'bg-[#64748B] text-white dark:bg-slate-800 dark:text-slate-200',
  LANDING_PAGE: 'bg-[#0E7490] text-white dark:bg-cyan-950 dark:text-cyan-200 dark:border dark:border-cyan-800/50',
  DEFAULT: 'bg-[#475569] text-white dark:bg-slate-700 dark:text-slate-300',
};

export function typeBadgeClass(type: string): string {
  return TYPE_BADGE_STYLES[type] ?? TYPE_BADGE_STYLES.DEFAULT;
}

export type AssetStatus = 'STAGED' | 'PRODUCTION';

export const STATUS_BADGE_STYLES: Record<AssetStatus, { container: string; dot: string; label: string }> = {
  STAGED: {
    container: 'bg-[#0EA5E9] text-white dark:bg-sky-600',
    dot: 'bg-sky-200',
    label: 'READY',
  },
  PRODUCTION: {
    container: 'bg-[#059669] text-white dark:bg-emerald-600 dark:shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    dot: 'bg-emerald-300',
    label: 'ACTIVE',
  },
};

export function statusBadge(status: string) {
  return STATUS_BADGE_STYLES[status as AssetStatus] ?? { container: TYPE_BADGE_STYLES.DEFAULT, dot: 'bg-slate-400', label: status };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors (file has no consumers yet, just needs to type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/assetBadgeStyles.ts
git commit -m "feat: add asset type/status badge style maps"
```

---

### Task 4: SkeletonLoader component

**Files:**
- Create: `src/components/sandbox/SkeletonLoader.tsx`

**Interfaces:**
- Produces: `export default function SkeletonLoader({ variant, count }: { variant: 'card' | 'row'; count?: number }): JSX.Element`. Consumed by `StagedAssetsList` (Task 8) during the loading state.

- [ ] **Step 1: Create the component**

```tsx
// src/components/sandbox/SkeletonLoader.tsx

function RowSkeleton() {
  return (
    <div className="bg-white/85 border border-white/60 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-5 flex items-center gap-4 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-1/3 bg-slate-300/70 dark:bg-slate-800 rounded" />
        <div className="h-3 w-2/3 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      </div>
      <div className="h-8 w-32 bg-slate-200/70 dark:bg-slate-800 rounded-lg shrink-0" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white/85 border border-white/60 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-4 w-1/2 bg-slate-300/70 dark:bg-slate-800 rounded" />
      <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      <div className="h-3 w-3/4 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      <div className="h-6 w-24 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
    </div>
  );
}

export default function SkeletonLoader({ variant, count = 3 }: { variant: 'card' | 'row'; count?: number }) {
  const items = Array.from({ length: count });
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((_, i) => <RowSkeleton key={i} />)}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/SkeletonLoader.tsx
git commit -m "feat: add SkeletonLoader component"
```

---

### Task 5: BulkActionBar component (extracted)

**Files:**
- Create: `src/components/sandbox/BulkActionBar.tsx`

**Interfaces:**
- Consumes: `Platform` from `@/lib/platformExport`.
- Produces:
```ts
export default function BulkActionBar(props: {
  selectedCount: number;
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  manualTargetUrl: string;
  onManualTargetUrlChange: (v: string) => void;
  deploying: boolean;
  exporting: boolean;
  onDeploy: () => void;
  onExport: () => void;
}): JSX.Element
```
Consumed by `StagedAssetsList` (Task 8), replacing the inline block currently at `StagedAssetsList.tsx:180-219`.

- [ ] **Step 1: Create the component**

This is the existing inline JSX from `StagedAssetsList.tsx:180-219` extracted to its own file, with the light/dark surface classes added:

```tsx
// src/components/sandbox/BulkActionBar.tsx
'use client';

import { Loader2, Send, FileArchive } from 'lucide-react';
import type { Platform } from '@/lib/platformExport';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function BulkActionBar({
  selectedCount,
  platform,
  onPlatformChange,
  manualTargetUrl,
  onManualTargetUrlChange,
  deploying,
  exporting,
  onDeploy,
  onExport,
}: {
  selectedCount: number;
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  manualTargetUrl: string;
  onManualTargetUrlChange: (v: string) => void;
  deploying: boolean;
  exporting: boolean;
  onDeploy: () => void;
  onExport: () => void;
}) {
  return (
    <div className="bg-white/85 border border-[#059669]/40 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-indigo-500/40 dark:shadow-2xl rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedCount} selected</span>
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => onPlatformChange(p)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              platform === p ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>
      <input
        value={manualTargetUrl}
        onChange={(e) => onManualTargetUrlChange(e.target.value)}
        placeholder="Target URL (used if the client has no custom domain set)…"
        className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500 min-w-[220px]"
      />
      <button
        onClick={onDeploy}
        disabled={deploying}
        className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
      >
        {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Deploy Campaign
      </button>
      <button
        onClick={onExport}
        disabled={exporting}
        className="py-2 px-3 bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5"
      >
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
        Export ZIP
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/BulkActionBar.tsx
git commit -m "feat: extract BulkActionBar component from StagedAssetsList"
```

---

### Task 6: AssetListRow component (extracted)

**Files:**
- Create: `src/components/sandbox/AssetListRow.tsx`

**Interfaces:**
- Consumes: `CreativeAsset` from `./types`, `ScorableType` from `@/lib/creativeScore`, `Platform` from `@/lib/platformExport`, `typeBadgeClass`/`statusBadge` from `./assetBadgeStyles` (Task 3), `ScoreBadge` (existing).
- Produces:
```ts
export default function AssetListRow(props: {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  orgs: { id: string; name: string }[];
  selectedOrgId: string | undefined;
  onSelectOrg: (id: string) => void;
  onPromote: () => void;
  promoting: boolean;
  onOptimized: (result: { title?: string; content: string; metadata?: any }) => void;
}): JSX.Element
```
Consumed by `StagedAssetsList` (Task 8) for the list view, replacing the inline row JSX at `StagedAssetsList.tsx:220-283`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/sandbox/AssetListRow.tsx
'use client';

import { Loader2, Rocket } from 'lucide-react';
import type { CreativeAsset } from './types';
import type { ScorableType } from '@/lib/creativeScore';
import type { Platform } from '@/lib/platformExport';
import { typeBadgeClass, statusBadge } from './assetBadgeStyles';
import ScoreBadge from './ScoreBadge';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function AssetListRow({
  asset,
  selected,
  onToggleSelected,
  orgs,
  selectedOrgId,
  onSelectOrg,
  onPromote,
  promoting,
  onOptimized,
}: {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  orgs: { id: string; name: string }[];
  selectedOrgId: string | undefined;
  onSelectOrg: (id: string) => void;
  onPromote: () => void;
  promoting: boolean;
  onOptimized: (result: { title?: string; content: string; metadata?: any }) => void;
}) {
  const status = statusBadge(asset.status);

  return (
    <div
      className={`rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 border backdrop-blur-md transition-colors ${
        selected
          ? 'bg-[#F0FDF4] border-[#059669] dark:bg-emerald-950/40 dark:border-emerald-500'
          : 'bg-white/85 border-white/60 shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl'
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(asset.id)}
            className="w-3.5 h-3.5 accent-emerald-600"
          />
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${status.container}`}>
            {status.label}
          </span>
          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${typeBadgeClass(asset.type)}`}>
            {asset.type.replace('_', ' ')}
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{asset.title}</span>
          {asset.organization && (
            <span className="text-[11px] text-slate-500 dark:text-slate-500">→ {asset.organization.name}</span>
          )}
          {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
            <span
              key={p}
              className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30"
            >
              {PLATFORM_LABELS[p]} Ready
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 whitespace-pre-wrap">{asset.content}</p>
        <ScoreBadge
          content={asset.content}
          type={asset.type as ScorableType}
          metadata={asset.metadata}
          onOptimized={onOptimized}
        />
      </div>

      {asset.status === 'STAGED' && (
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => onSelectOrg(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select client…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            onClick={onPromote}
            disabled={promoting}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 shrink-0"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Promote to Production
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/AssetListRow.tsx
git commit -m "feat: extract AssetListRow component from StagedAssetsList"
```

---

### Task 7: AssetCard component (new grid view)

**Files:**
- Create: `src/components/sandbox/AssetCard.tsx`

**Interfaces:**
- Consumes: same as `AssetListRow` (Task 6) — `CreativeAsset`, `ScorableType`, `Platform`, `typeBadgeClass`/`statusBadge`, `ScoreBadge`.
- Produces: same prop shape as `AssetListRow` (identical `props` type) so `StagedAssetsList` (Task 8) can swap between the two by view mode without a shim:
```ts
export default function AssetCard(props: {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  orgs: { id: string; name: string }[];
  selectedOrgId: string | undefined;
  onSelectOrg: (id: string) => void;
  onPromote: () => void;
  promoting: boolean;
  onOptimized: (result: { title?: string; content: string; metadata?: any }) => void;
}): JSX.Element
```

- [ ] **Step 1: Create the component**

```tsx
// src/components/sandbox/AssetCard.tsx
'use client';

import { Loader2, Rocket } from 'lucide-react';
import type { CreativeAsset } from './types';
import type { ScorableType } from '@/lib/creativeScore';
import type { Platform } from '@/lib/platformExport';
import { typeBadgeClass, statusBadge } from './assetBadgeStyles';
import ScoreBadge from './ScoreBadge';

const PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];
const PLATFORM_LABELS: Record<Platform, string> = { META: 'Meta Ads', GOOGLE: 'Google Ads', TIKTOK: 'TikTok' };

export default function AssetCard({
  asset,
  selected,
  onToggleSelected,
  orgs,
  selectedOrgId,
  onSelectOrg,
  onPromote,
  promoting,
  onOptimized,
}: {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  orgs: { id: string; name: string }[];
  selectedOrgId: string | undefined;
  onSelectOrg: (id: string) => void;
  onPromote: () => void;
  promoting: boolean;
  onOptimized: (result: { title?: string; content: string; metadata?: any }) => void;
}) {
  const status = statusBadge(asset.status);

  return (
    <div
      className={`rounded-2xl p-5 flex flex-col gap-3 border backdrop-blur-md transition-colors h-full ${
        selected
          ? 'bg-[#F0FDF4] border-[#059669] dark:bg-emerald-950/40 dark:border-emerald-500'
          : 'bg-white/85 border-white/60 shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(asset.id)}
            className="w-3.5 h-3.5 accent-emerald-600"
          />
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${status.container}`}>
            {status.label}
          </span>
        </div>
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadgeClass(asset.type)}`}>
          {asset.type.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{asset.title}</h3>
        {asset.organization && (
          <p className="text-[11px] text-slate-500 dark:text-slate-500">→ {asset.organization.name}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap">{asset.content}</p>
      </div>

      {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.filter((p) => asset.metadata?.deployments?.[p]?.status === 'ACTIVE').map((p) => (
            <span
              key={p}
              className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30"
            >
              {PLATFORM_LABELS[p]} Ready
            </span>
          ))}
        </div>
      )}

      <ScoreBadge
        content={asset.content}
        type={asset.type as ScorableType}
        metadata={asset.metadata}
        onOptimized={onOptimized}
      />

      {asset.status === 'STAGED' && (
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => onSelectOrg(e.target.value)}
            className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select client…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            onClick={onPromote}
            disabled={promoting}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1.5 shrink-0"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/AssetCard.tsx
git commit -m "feat: add AssetCard grid-view component"
```

---

### Task 8: AssetsSidebar component (filters + view toggle)

**Files:**
- Create: `src/components/sandbox/AssetsSidebar.tsx`

**Interfaces:**
- Consumes: nothing beyond `lucide-react` icons.
- Produces:
```ts
export type StatusFilter = 'ALL' | 'STAGED' | 'PRODUCTION';
export type TypeFilter = 'ALL' | 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'LANDING_PAGE';

export default function AssetsSidebar(props: {
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}): JSX.Element
```
Consumed by `StagedAssetsList` (Task 9), which owns `statusFilter`/`typeFilter`/`viewMode` state and passes it down.

- [ ] **Step 1: Create the component**

```tsx
// src/components/sandbox/AssetsSidebar.tsx
'use client';

import { LayoutGrid, List } from 'lucide-react';

export type StatusFilter = 'ALL' | 'STAGED' | 'PRODUCTION';
export type TypeFilter = 'ALL' | 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'LANDING_PAGE';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'STAGED', label: 'Ready' },
  { value: 'PRODUCTION', label: 'Active' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'COPY', label: 'Copy' },
  { value: 'AD', label: 'Ad' },
  { value: 'VIDEO_SCRIPT', label: 'Video' },
  { value: 'LANDING_PAGE', label: 'Landing' },
];

function pillGroup<T extends string>(
  options: { value: T; label: string }[],
  active: T,
  onChange: (v: T) => void,
) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
            active === opt.value
              ? 'bg-[#059669] text-white border-[#059669] dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-white/85 text-slate-500 border-white/60 dark:bg-slate-900/70 dark:text-slate-400 dark:border-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AssetsSidebar({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange,
}: {
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}) {
  return (
    <div className="bg-white/85 border border-white/60 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-4 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-500">Status</span>
          {pillGroup(STATUS_OPTIONS, statusFilter, onStatusFilterChange)}
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-500">Type</span>
          {pillGroup(TYPE_OPTIONS, typeFilter, onTypeFilterChange)}
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-1 shrink-0">
        <button
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
          className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
          className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/AssetsSidebar.tsx
git commit -m "feat: add AssetsSidebar filter and view-toggle component"
```

---

### Task 9: Wire StagedAssetsList as orchestrator

**Files:**
- Modify: `src/components/sandbox/StagedAssetsList.tsx` (full rewrite of the render logic; state/fetch/promote/deploy/export logic is kept)

**Interfaces:**
- Consumes: `AssetsSidebar` + `StatusFilter`/`TypeFilter` (Task 8), `BulkActionBar` (Task 5), `AssetListRow` (Task 6), `AssetCard` (Task 7), `SkeletonLoader` (Task 4).
- Produces: no external interface change — still `export default function StagedAssetsList({ activeTool }: { activeTool: SandboxTool })`, same as today. This is the final integration task; nothing downstream depends on its internals.

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `src/components/sandbox/StagedAssetsList.tsx`:

```tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';
import type { CreativeAsset, SandboxTool } from './types';
import type { Platform } from '@/lib/platformExport';
import AssetsSidebar, { type StatusFilter, type TypeFilter } from './AssetsSidebar';
import BulkActionBar from './BulkActionBar';
import AssetListRow from './AssetListRow';
import AssetCard from './AssetCard';
import SkeletonLoader from './SkeletonLoader';

// 'campaign' and 'swipe' are intentionally absent — both produce mixed-type
// output (COPY + AD), so their Staged Assets view shows everything, unfiltered.
const TOOL_TYPE: Partial<Record<SandboxTool, string>> = { copy: 'COPY', ad: 'AD', video: 'VIDEO_SCRIPT', 'landing-page': 'LANDING_PAGE' };

export default function StagedAssetsList({ activeTool }: { activeTool: SandboxTool }) {
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<Platform>('META');
  const [manualTargetUrl, setManualTargetUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const type = TOOL_TYPE[activeTool];
      const [assetsRes, orgsRes] = await Promise.all([
        fetch(type ? `/api/sandbox/assets?type=${type}` : '/api/sandbox/assets'),
        fetch('/api/sandbox/organizations'),
      ]);
      setAssets(await assetsRes.json());
      setOrgs(await orgsRes.json());
    } catch {
      toast.error('Failed to load staged assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelectedIds(new Set());
    setManualTargetUrl('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  const promote = async (assetId: string) => {
    const organizationId = selectedOrg[assetId];
    if (!organizationId) {
      toast.error('Pick a client organization first');
      return;
    }
    setPromotingId(assetId);
    try {
      const res = await fetch(`/api/sandbox/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Promote failed');
      toast.success('Promoted to Production');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote asset');
    } finally {
      setPromotingId(null);
    }
  };

  const toggleSelected = (assetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const selectedAssets = assets.filter((a) => selectedIds.has(a.id));

  const buildDeployBody = (action: 'deploy' | 'export') => {
    const targetUrls: Record<string, string> = {};
    if (manualTargetUrl.trim()) {
      for (const a of selectedAssets) {
        targetUrls[a.id] = manualTargetUrl.trim();
      }
    }
    return { action, assetIds: Array.from(selectedIds), platform, targetUrls };
  };

  const deploySelected = async () => {
    if (selectedIds.size === 0) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/sandbox/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDeployBody('deploy')),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      toast.success(`Deployed ${data.payloads.length} asset(s) to ${platform}`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deploy');
    } finally {
      setDeploying(false);
    }
  };

  const exportSelected = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/sandbox/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDeployBody('export')),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'platform-export.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const optimizeAsset = async (assetId: string, content: string, title: string | undefined, metadata: any) => {
    try {
      const res = await fetch(`/api/sandbox/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, metadata, ...(title ? { title } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save optimized content');
      setAssets((prev) => prev.map((a) => (a.id === assetId ? data.asset : a)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save optimized content');
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
      return true;
    });
  }, [assets, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonLoader variant={viewMode} count={viewMode === 'grid' ? 6 : 3} />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white/85 border border-white/60 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-500 text-sm">
        <Archive className="w-6 h-6" />
        No staged assets yet for this tool. Generate and save one from Draft Canvas.
      </div>
    );
  }

  const rowProps = (asset: CreativeAsset) => ({
    asset,
    selected: selectedIds.has(asset.id),
    onToggleSelected: toggleSelected,
    orgs,
    selectedOrgId: selectedOrg[asset.id],
    onSelectOrg: (id: string) => setSelectedOrg((prev) => ({ ...prev, [asset.id]: id })),
    onPromote: () => promote(asset.id),
    promoting: promotingId === asset.id,
    onOptimized: (r: { title?: string; content: string; metadata?: any }) =>
      optimizeAsset(asset.id, r.content, r.title, r.metadata || asset.metadata),
  });

  return (
    <div className="space-y-3">
      <AssetsSidebar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          platform={platform}
          onPlatformChange={setPlatform}
          manualTargetUrl={manualTargetUrl}
          onManualTargetUrlChange={setManualTargetUrl}
          deploying={deploying}
          exporting={exporting}
          onDeploy={deploySelected}
          onExport={exportSelected}
        />
      )}

      {filteredAssets.length === 0 ? (
        <div className="bg-white/85 border border-white/60 backdrop-blur-md shadow-sm dark:bg-slate-900/70 dark:border-slate-800/80 dark:shadow-2xl rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-500 text-sm">
          No assets match the current filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} {...rowProps(asset)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <AssetListRow key={asset.id} {...rowProps(asset)} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: the `toast.success` deploy message dropped `PLATFORM_LABELS[platform]` in favor of the raw `platform` since that lookup moved into `BulkActionBar`; this keeps `StagedAssetsList` free of a duplicate label map (YAGNI — it's a toast string, not user-facing chrome).

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification (dev server)**

Run: `npm run dev`, open the sandbox, switch to the "Staged Assets" view for a tool with existing staged assets.

Check, in both dark (default) and light (via the `ThemeToggle` in `AdminNav`) themes:
- List view renders rows matching the pre-refactor look (status/type badges, org, platform-ready badges, score badge, promote flow).
- Toggle to grid view — cards render with the same data, selected-card wash applies when checked.
- Status and type filter pills narrow the visible set; "no assets match" empty state shows when a filter excludes everything.
- Selecting one or more assets shows `BulkActionBar`; deploy and export still work end to end (existing API calls unchanged).
- Promoting a STAGED asset still works (org select + Promote button).
- Loading state (throttle network or reload) shows `SkeletonLoader` matching the current view mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/sandbox/StagedAssetsList.tsx
git commit -m "feat: wire StagedAssetsList as orchestrator for themed asset components"
```

---

## Self-Review Notes

- **Spec coverage:** theme mechanism (Task 1), ThemeToggle (Task 2), badge maps (Task 3), SkeletonLoader (Task 4), BulkActionBar (Task 5), AssetListRow (Task 6), AssetCard (Task 7), AssetsSidebar (Task 8), orchestration (Task 9) — every component named in the spec has a task.
- **Type consistency:** `AssetListRow` and `AssetCard` share an identical prop shape by design (Task 6/7 interfaces), verified against the `rowProps()` helper in Task 9 that feeds both via spread.
- **No placeholders:** every task has full component code, not descriptions.
