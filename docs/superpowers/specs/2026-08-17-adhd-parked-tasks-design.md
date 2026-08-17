# ADHD "Park for Later" Drawer — Design

Date: 2026-08-17

## Purpose

Let overwhelming/non-essential tasks be swept off the active board on
`/admin/tasks` without deleting them — an ADHD "out of sight, out of guilt"
tool, same family as Brain Dump / Surprise Me / Ambient Audio / Dopamine
Reset / Energy Filtering / Gamification already shipped.

## 1. Schema (`prisma/schema.prisma`)

Add to `Task`:

```prisma
isParked Boolean @default(false)
```

Synced via `npx prisma db push` (as specified) — same live Supabase DB, same
tool used for the Energy Level feature after `migrate dev` hit pre-existing
drift there. Additive, defaults `false`, no data loss.

## 2. API

- `POST /api/focus-tasks`: accept optional `isParked` in the create body
  (defaults to `false` via schema either way, but accepted for
  completeness/consistency with the pass-through pattern).
- `PATCH /api/focus-tasks/[id]`: add `isParked` to the existing
  `...(x !== undefined && {x})` conditional-spread pattern (same shape as
  `energyLevel`, `subtasks`, etc.).

## 3. UI (`src/app/(admin)/admin/tasks/page.tsx`)

### Card action

📦 "Park" icon-button added to the existing per-card action cluster
(alongside the Focus and Star icons). Click PATCHes `isParked: true` and
optimistically updates local state — no confirmation dialog, trivially
reversible via the drawer.

### Filtering — removed outright, not CSS-hidden

Unlike the Energy Filter (a togglable view state, so non-matching cards stay
mounted and CSS-collapse to keep `Draggable` indices stable), parking is a
persisted per-task flag that doesn't flip back and forth mid-render.
Parked tasks are filtered out of the source arrays directly:

- Kanban columns: `tasks.filter((t) => t.status === col.id && !t.isParked)`.
- `openTasks` (drives Focus Mode + Surprise Me): adds `&& !t.isParked`.
- `focusTasks` (Top 3 Focus view): adds `&& !t.isParked` — confirmed with
  user. The underlying `isFocusToday`/`focusOrder` flags are untouched by
  parking, so un-parking a starred task brings it straight back into Top 3
  without re-starring.

### Parked Tasks Drawer

New `ParkedTasksDrawer.tsx`, same visual pattern as `BrainDumpModal.tsx` /
`DopamineResetDrawer.tsx` (dark backdrop, centered card). Trigger: new
"📦 Parked (N)" pill button in the header, next to the energy filter row —
`N` is the live count of `tasks.filter(t => t.isParked).length`. Lists each
parked task's title with an "Unpark" button that PATCHes `isParked: false`
and calls `load()` to refresh the board.

## Error handling

Same convention as the rest of this file — optimistic local update, PATCH
fired without explicit error UI (matches `toggleFocus`/`cycleEnergyLevel`
today, not introducing a new pattern here).

## Out of scope

- No bulk-park/unpark.
- No auto-expiry or "parked since" aging indicator.

## Testing

- `tsc --noEmit` clean.
- Manual: park a task from the board, confirm it disappears from Kanban,
  Focus Mode, Surprise Me, and Top 3 Focus (if starred); open the drawer,
  confirm it's listed with the correct count; unpark, confirm it reappears
  everywhere it was hidden from.
