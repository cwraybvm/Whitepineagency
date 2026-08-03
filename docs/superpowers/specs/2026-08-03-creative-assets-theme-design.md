# Creative Assets Dashboard — Dark/Light Theme Overhaul

## Purpose

Add a site-wide dark/light theme toggle ("Obsidian Pine" dark, "Mineral Sage" light) and restyle the Staged Assets feature (the de facto "Creative Assets dashboard" — `src/components/sandbox/StagedAssetsList.tsx` and friends, reached via the sandbox's "Staged Assets" tab) into a themeable component tree with a grid/list view toggle and a filter sidebar.

## Scope decisions

- **Base feature**: reskin/restructure the existing sandbox Staged Assets feature (`CreativeAsset` type, `/api/sandbox/assets` API). Not a new page or data model.
- **Theme toggle scope**: site-wide. `next-themes` wraps the whole app at root layout. Only the Assets subtree gets full light-mode styling in this pass; other routes keep looking as they do today (dark-only classes) until themed separately.
- **Status badges**: map onto the two real `CreativeAsset` statuses only — `STAGED` → "READY" badge styling, `PRODUCTION` → "ACTIVE" badge styling. No new statuses (DRAFT/REVIEW) are added to the data model.
- **Type badges**: map onto real `CreativeAsset.type` values — `COPY`, `AD`, `VIDEO_SCRIPT` → VIDEO styling, `LANDING_PAGE` → LANDING styling, plus a DEFAULT fallback.
- **View modes**: add a grid/list toggle. `AssetListRow` = current dense row layout. `AssetCard` = new grid-view card.
- **Sidebar**: new component scoped to the Assets view (filters + view-mode toggle). Does not replace or rename the existing global `AdminNav`.

## Architecture

### Theme mechanism

- Add `next-themes` dependency.
- `src/app/layout.tsx`: remove the hardcoded `"dark"` class from `<html>`. Wrap `{children}` in `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>`.
- No Tailwind config changes needed — the project (Tailwind v4, CSS-first config) already declares `@custom-variant dark (&:is(.dark *));` in `globals.css`, which is exactly the selector strategy `next-themes attribute="class"` produces.
- Palette hex values from the design handoff are applied directly as Tailwind arbitrary-value classes in the components that use them (e.g. `bg-[#E2E8E4] dark:bg-[#090C0A]`). No new CSS custom properties — the existing unused shadcn oklch token pairs in `globals.css` (`:root` / `.dark`, lines ~394-445) are left as-is and not touched by this work; they're a separate, generic system this feature doesn't depend on.

### Badge styles

New file `src/components/sandbox/assetBadgeStyles.ts`:

```ts
import type { Platform } from '@/lib/platformExport';

export const TYPE_BADGE_STYLES: Record<string, string> = {
  AD: 'bg-[#1A3C34] text-white dark:bg-emerald-950 dark:text-emerald-200 dark:border dark:border-emerald-800/50',
  VIDEO_SCRIPT: 'bg-[#0F766E] text-white dark:bg-teal-950 dark:text-teal-200 dark:border dark:border-teal-800/50',
  COPY: 'bg-[#64748B] text-white dark:bg-slate-800 dark:text-slate-200',
  LANDING_PAGE: 'bg-[#0E7490] text-white dark:bg-cyan-950 dark:text-cyan-200 dark:border dark:border-cyan-800/50',
  DEFAULT: 'bg-[#475569] text-white dark:bg-slate-700 dark:text-slate-300',
};

export const STATUS_BADGE_STYLES: Record<'STAGED' | 'PRODUCTION', { container: string; dot: string; label: string }> = {
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
```

### Component tree (`src/components/sandbox/`)

- **`AssetCard.tsx`** — grid-view card. Selection checkbox, type + status badges, title, org name, platform-ready badges, `ScoreBadge`. Selected state: light `bg-[#F0FDF4] border-[#059669]`, dark `dark:bg-emerald-950/40 dark:border-emerald-500`. Unselected: glass surface (`bg-white/85 border-white/60 backdrop-blur-md shadow-sm` light, `dark:bg-slate-900/70 dark:border-slate-800/80 dark:backdrop-blur-md dark:shadow-2xl` dark).
- **`AssetListRow.tsx`** — extracted from `StagedAssetsList.tsx` lines 220-283 (current per-asset row JSX), restyled with the same light/dark surface + selected-wash rules as `AssetCard`.
- **`BulkActionBar.tsx`** — extracted from `StagedAssetsList.tsx` lines 180-219 (platform picker, target URL input, Deploy/Export buttons), restyled.
- **`AssetsSidebar.tsx`** — new. Status filter (All/Staged/Production), type filter (All/Copy/Ad/Video/Landing), grid/list view-mode toggle. Local UI state only, filters the in-memory `assets` array — no new API params.
- **`SkeletonLoader.tsx`** — `variant: "card" | "row"` prop, pulse-bar placeholder matching the corresponding real component's shape. Replaces the current spinner-only loading state.
- **`ThemeToggle.tsx`** — sun/moon icon button using `useTheme()` from `next-themes`. Mounted in `AdminNav` (site-wide placement since `AdminNav` is the shared shell nav).

### Orchestration

`StagedAssetsList.tsx` keeps its existing state/fetch/promote/deploy/export logic, adds `viewMode: 'grid' | 'list'` and filter state, and renders:

```
AssetsSidebar (filters + view toggle)
BulkActionBar (only when selectedIds.size > 0)
SkeletonLoader×N (while loading)  |  AssetCard grid or AssetListRow list (loaded)
```

Text hierarchy throughout: light `text-slate-900` / `text-slate-500`, dark `dark:text-slate-100` / `dark:text-slate-400`.

## Error handling

Unchanged — existing `toast.error(...)` pattern on fetch/promote/deploy/export failures stays as-is.

## Testing

No test framework is set up for this feature currently (matches rest of the sandbox code). Verification is manual: run the dev server, exercise the Staged Assets tab in both themes — toggle theme, switch grid/list view, select/deselect assets (bulk bar appears/disappears, selected wash renders), filter by status/type, promote a staged asset, deploy/export a selection — confirm no regressions in existing promote/deploy/export flows.

## Out of scope

- Org filter in the sidebar (not requested).
- New DRAFT/REVIEW lifecycle statuses (not part of the real data model).
- Theming any route/page outside the Assets subtree beyond having the toggle mechanism available.
