# ADHD Executive Summary — Weekly Stats + Streak Records — Design

Date: 2026-08-17

## Purpose

Surface weekly completion throughput, focus hours, streak records, and an
energy-level breakdown for `/admin/tasks` — same family as Brain Dump /
Surprise Me / Ambient Audio / Dopamine Reset / Energy Filtering /
Gamification / Parked Tasks / Time-Boxing already shipped.

## The blocking data question (resolved)

"Tasks completed this week vs. last week" requires knowing *when* a task
was marked done. `Task` has no such field — `updatedAt` is unsafe as a
proxy because it bumps on any later edit to an already-Done task (this
app's cards allow cycling the energy/duration badge on any column,
including Done). User confirmed: add a real `completedAt` column rather
than approximate with `updatedAt`.

## 1. Schema (`prisma/schema.prisma`)

```prisma
completedAt DateTime? // Set server-side when status transitions to DONE
```

Synced via `npx prisma db push` (same live DB, same tool used for the last
3 additive schema changes this session).

### Set server-side, not client-supplied

`PATCH /api/focus-tasks/[id]` (`src/app/api/focus-tasks/[id]/route.ts`):
when `status` is included in the request body, derive `completedAt`
automatically instead of accepting it as a field:

```ts
...(status !== undefined && { status, completedAt: status === 'DONE' ? new Date() : null }),
```

Avoids trusting a client-supplied timestamp (clock skew, tampering) and
needs **no changes** to existing call sites — `completeTask()` and
`handleDragEnd()`'s Done branch in `tasks/page.tsx` already just
`PATCH {status: 'DONE'}`. Moving a task back out of Done clears
`completedAt`, keeping the field consistent with current status. Tasks
already `DONE` before this ships have `completedAt: null` until they're
next touched — excluded from week-over-week math rather than backfilled
with a guess.

`GET /api/focus-tasks` needs no changes — unrestricted `findMany` already
returns new columns automatically.

## 2. `src/lib/taskAnalytics.ts`

Self-contained pure functions — takes its own minimal task shape (not
imported from the page component, keeping the lib decoupled from
`'use client'` UI code):

```ts
export interface AnalyticsTask {
  status: 'INBOX' | 'ACTIVE' | 'DONE';
  completedAt: string | null;
  estimatedMinutes: number | null;
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  isParked: boolean;
}
```

- `getWeeklyStats(tasks, now = new Date())` — **rolling 7-day windows**,
  not calendar Sun-Sat weeks (matches the spec's "current 7-day window"
  wording, avoids calendar-boundary edge cases):
  - `completedThisWeek`: `completedAt` in `[now-7d, now]`.
  - `completedLastWeek`: `completedAt` in `[now-14d, now-7d)`.
  - `trendPercent`: `null` when `completedLastWeek === 0` (no baseline to
    compare against — displayed as "new" rather than a misleading ±%),
    else `round(((thisWeek - lastWeek) / lastWeek) * 100)`.
  - `completionRate`: `completedThisWeek / (completedThisWeek + stillOpenCount)`
    as a 0-100 percent, where `stillOpenCount` is current non-DONE,
    non-parked tasks — "of everything currently in play, what fraction
    got closed out this week." A judgment call given tasks have no
    per-week assignment; documented inline as such.
  - `hoursCompletedThisWeek`: sum of `estimatedMinutes` for
    `completedThisWeek` tasks, divided by 60.

- `getEnergyBreakdown(tasks, now = new Date())` — among `completedThisWeek`
  tasks (same 7-day window, for consistency with Weekly Throughput), counts
  by `LOW` / `MEDIUM` / `HIGH` / `UNTAGGED`, returns
  `{level, count, percent}[]` ready for a `recharts` `PieChart`.

- `getStreakConsistency(tasks, now = new Date())` — percent (0-100) of the
  trailing 7 calendar days that have at least one `completedAt` falling on
  them.

`currentStreak` / `longestStreak` are **not** recomputed here — reused
directly from the existing `src/lib/taskStreak.ts` (`getTaskStreak()`),
per the spec's "using existing streak data."

## 3. `ExecutiveSummaryDrawer.tsx`

`src/components/admin/ExecutiveSummaryDrawer.tsx`, same visual pattern as
the other drawers (`ParkedTasksDrawer`, `DopamineResetDrawer`). Trigger:
"📊 Insights" button in the main header button row (`tasks/page.tsx`,
alongside Top 3 Focus / Focus Mode / Surprise Me / 5-Min Reset).

Four cards:

1. **Weekly Throughput** — `completedThisWeek` count, trend line ("+20%
   vs last week" / "new" when no baseline / "−N%" for a decline).
2. **Focus Hours Logged** — `hoursCompletedThisWeek`, formatted like the
   existing header time counter (`Xm` / `X.X hrs`).
3. **Streak Achievements** — current streak, longest streak (from
   `taskStreak.ts`), and `streakConsistencyPercent` as a small badge/label.
4. **Energy Distribution** — `recharts` `PieChart` (already a dependency,
   `package.json` — no new install) over `getEnergyBreakdown()`'s slices,
   colored to match the existing energy badge palette (amber/indigo/red).

## Error handling

Purely client-side computation over already-loaded `tasks` state — no new
network calls, no dedicated error handling needed beyond what `load()`
already provides.

## Out of scope

- No historical trend beyond this-week-vs-last-week (no multi-week
  chart/graph).
- No export/sharing of the summary.
- No backfilling `completedAt` for tasks already Done before this ships.

## Testing

- `tsc --noEmit` clean.
- Manual: complete several tasks across different energy levels over
  (simulated) different days, open Insights, confirm throughput count,
  trend sign, focus hours, streak numbers, and energy pie all read
  correctly; confirm "new" (not a misleading %) shows when last week had
  zero completions.
