# ADHD Estimated Duration Tags + Time-Boxing — Design

Date: 2026-08-17

## Purpose

Make time investment visible per-task and pre-populate Focus Mode's timer
from it — an ADHD time-blindness aid, same family as Brain Dump / Surprise
Me / Ambient Audio / Dopamine Reset / Energy Filtering / Gamification /
Parked Tasks already shipped.

## 1. Schema (`prisma/schema.prisma`)

Add to `Task`:

```prisma
estimatedMinutes Int? // Quick-picked: 5, 15, 30, 60, or 120
```

Synced via `npx prisma db push` (as specified) — same live Supabase DB,
same tool used for Energy Level and Parked Tasks after `migrate dev` hit
pre-existing drift once. Additive, nullable, no data loss.

## 2. API

- `POST /api/focus-tasks`: accept optional `estimatedMinutes`.
- `PATCH /api/focus-tasks/[id]`: add `estimatedMinutes` to the existing
  `...(x !== undefined && {x})` conditional-spread pattern (same shape as
  `energyLevel`, `isParked`).

## 3. UI (`src/app/(admin)/admin/tasks/page.tsx`)

### Duration picker — reuses the established cycle pattern

Five canonical values: 5, 15, 30, 60, 120 minutes (⏱️ 5m / 15m / 30m / 1h /
2h). Rather than a new dropdown/popover component, this reuses the
click-to-cycle pattern already shipped for the energy badge:

- **Quick Add**: 5-button chip row (mirrors the existing 3-button energy
  picker), local state `quickAddMinutes: number | null`, included in the
  create POST body.
- **Card badge**: clicking cycles
  `null → 5 → 15 → 30 → 60 → 120 → null`, PATCHing on each click — same
  interaction as the existing energy badge, just a longer cycle.

### Badge formatting

Generic formatter handles the 5 canonical values (and is robust to any
stray legacy value): `< 60` → `"{n}m"`, `>= 60` → `"{n/60}h"` (trimmed,
e.g. `1h`, `2h`).

### Header time counter

"⏳ X.Xhrs remaining today" (or "⏳ Nm remaining today" under an hour) in
the page header. Sums `estimatedMinutes` over `openTasks` — which already
excludes `DONE` and `isParked` tasks (per the Parked Tasks feature) —
**ignoring the active energy filter**, confirmed with user: the counter
reads as total day workload, not a number that jumps around as the energy
filter is switched. Tasks with no `estimatedMinutes` set contribute `0`.
Hidden entirely when the sum is `0` (nothing estimated yet), same pattern
as the streak badge hiding at `0`.

## 4. Focus Mode pre-population

`FocusModeOverlay.tsx`'s `FocusOverlayTask` interface gains
`estimatedMinutes: number | null`. Currently `minutes` state defaults to
`25` unconditionally on mount. New behavior: a `useEffect` keyed on
`task?.id` sets `minutes` to `task.estimatedMinutes` when present, else
falls back to the existing `25` default — fires on initial mount and on
every Prev/Next task switch, matching the existing `secondsLeft` reset
effect already keyed the same way (`FocusModeOverlay.tsx:107-111`). The
existing `15m`/`25m` quick-select buttons (`DURATIONS`) are untouched —
if the prefilled value doesn't match either, neither shows as active,
which is fine; the countdown display (`mm:ss`) reflects the real value
either way.

## Error handling

Same convention as the rest of this file — optimistic local update, PATCH
fired without dedicated error UI (matches `cycleEnergyLevel`/`setParked`
today).

## Out of scope

- No editing `DURATIONS` (Focus Mode's own 15m/25m quick buttons) to match
  the 5-value set — not requested, avoids scope creep on an unrelated
  control.
- No "over/under estimate" tracking or actual-vs-estimated reporting.

## Testing

- `tsc --noEmit` clean.
- Manual: set durations via Quick Add and via card-badge cycling, confirm
  badge formatting (5m/15m/30m/1h/2h); confirm header counter sums
  correctly and ignores the energy filter; enter Focus Mode on a task with
  an estimate set, confirm the timer starts prefilled to that value;
  Prev/Next to a task with a different (or no) estimate, confirm it
  updates.
