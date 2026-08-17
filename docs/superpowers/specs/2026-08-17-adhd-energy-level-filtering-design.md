# ADHD Cognitive Energy Level Tagging + Filtering — Design

Date: 2026-08-17

## Purpose

Let tasks on `/admin/tasks` be tagged with a cognitive energy level (Low /
Medium / High) so the board can be filtered down to only what matches
current mental capacity — an ADHD executive-function aid, same family as
Brain Dump / Surprise Me / Ambient Audio / Dopamine Reset already shipped.

## Database setup (discovered)

Prisma 7, config-based (`prisma.config.ts`), not the classic
`datasource { url = env(...) }` in `schema.prisma` — that block only has
`provider = "postgresql"`, no `url` line, which is correct for this
version (confirmed via `npx prisma validate`, passes clean). Migrations run
against `DIRECT_URL` (non-pooled), not `DATABASE_URL` (pgbouncer
transaction-mode pooler on :6543, can't hold the advisory lock `migrate`
needs — see the comment in `prisma.config.ts:11-13`). `src/lib/prisma.ts`
runtime client also prefers `DIRECT_URL` over `DATABASE_URL`.
`DATABASE_URL` points at a live Supabase Postgres instance — this is a
real remote database, not local. User confirmed running the migration
against it.

## 1. Schema (`prisma/schema.prisma`)

```prisma
enum EnergyLevel {
  LOW
  MEDIUM
  HIGH
}
```

Add to `Task` (`prisma/schema.prisma:632`):

```prisma
energyLevel EnergyLevel?
```

Nullable — existing rows unaffected, purely additive. Migration:
`npx prisma migrate dev --name add_task_energy_level`, same flow as the
prior `TimeEntry.description` addition
(`docs/superpowers/specs/2026-08-17-focus-mode-timer-integration-design.md`).

## 2. API

- `POST /api/focus-tasks` (`src/app/api/focus-tasks/route.ts`): accept
  optional `energyLevel` in the create body, pass through to
  `prisma.task.create`.
- `PATCH /api/focus-tasks/[id]` (`src/app/api/focus-tasks/[id]/route.ts`):
  add `energyLevel` to the existing `...(x !== undefined && {x})`
  conditional-spread pattern (same shape as `subtasks`, `isFocusToday`,
  etc. — no new pattern needed).

## 3. UI (`src/app/(admin)/admin/tasks/page.tsx`)

### Client type

`FocusTask.energyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null` added to the
existing interface.

### Quick Add picker

3-button toggle group (⚡ / 🧠 / 🔥) next to the Quick Add input, local
state `quickAddEnergy: EnergyLevel | null` (defaults `null`, i.e.
unset/no badge). Included in the `POST /api/focus-tasks` body.

### Card badge (create-and-edit-in-one, inline)

No task-edit modal exists in this codebase (cards are inline-edited today
— star toggle, subtask checkboxes, drag between columns). The energy
badge on each card follows that same pattern: click cycles
`null → LOW → MEDIUM → HIGH → null`, PATCHing on each click. Badge colors:
Low = amber, Medium = indigo/blue, High = red/orange, matching the emoji
(⚡🧠🔥) already specified. No badge shown when `energyLevel` is `null`.

### Header filter bar

New pill row: "All / ⚡ Low / 🧠 Medium / 🔥 High", state
`energyFilter: EnergyLevel | 'ALL'`. Filters the Kanban board columns only
— Focus Mode, Surprise Me, and Brain Dump continue operating on the full
task list, unfiltered. Not requested for those flows and would add scope
this spec doesn't cover.

### "Smoothly hide" non-matching cards

Cards for non-matching tasks are **not removed** from the rendered
array — removing them would shift `Draggable` `index` props out of sync
with `@hello-pangea/dnd`'s internal state, breaking drag-and-drop
reordering for the remaining visible cards. Instead, a CSS transition
(`opacity-0 max-h-0 mb-0 overflow-hidden pointer-events-none` vs.
`opacity-100 max-h-[...] mb-2`) is applied conditionally, so all cards
stay mounted (drag indices stable) but non-matching ones visually
collapse and become non-interactive.

## Error handling

- Badge PATCH failures: same pattern as `toggleFocus`/`toggleSubtask`
  today — no explicit error UI beyond what those already do (silent
  no-op on non-OK response is the existing convention, not introducing a
  new one here).

## Out of scope

- Energy-level-aware Focus Mode / Surprise Me selection (e.g. "give me a
  low-energy task") — not requested; Surprise Me's existing
  priority-weighted pick is untouched.
- Bulk-editing energy level across multiple tasks.

## Testing

- `tsc --noEmit` clean.
- Manual: set energy on a few tasks via Quick Add and via card-badge
  cycling, confirm colors/emoji match spec, confirm filter bar hides
  non-matching cards smoothly, confirm drag-and-drop still works correctly
  with a filter active (dragging a visible card between columns doesn't
  misplace a hidden one).
