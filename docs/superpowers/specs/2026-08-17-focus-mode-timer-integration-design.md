# Focus Mode ↔ Billing Timer Integration — Design

Date: 2026-08-17

## Purpose

Connect the ADHD Focus Mode overlay (`FocusModeOverlay.tsx`) directly to the
existing Billing Timer module so time is tracked automatically while a user
works a task in Focus Mode, and logged as a `TimeEntry` on completion.

## Constraints discovered

- `TimeEntry` (prisma/schema.prisma:564-579) has no `description` column —
  needs a migration (approved). No `Task`/`Organization`/`Subscription` has
  an hourly-rate field anywhere in the schema — rate display is out of
  scope; the widget shows elapsed time only (approved).
- The timer is a single, app-wide active entry, enforced server-side
  (`POST /api/time-entries` 409s if any entry has `endTime: null`,
  `src/app/api/time-entries/route.ts:36-39`). This is a solo-operator
  assumption already baked into `BillingTimerWidget.tsx` — Focus Mode must
  respect it, not fork a parallel per-task timer concept.
- `Task.organizationId` (schema:583) already exists and is already returned
  by `GET /api/focus-tasks` (unfiltered `findMany`), but isn't threaded
  through the client-side `FocusTask` (`page.tsx:8-17`) or
  `FocusOverlayTask` (`FocusModeOverlay.tsx:14-18`) types yet.
- `BillingTimerWidget` is mounted globally in `(admin)/admin/layout.tsx`
  (and fulfillment/sandbox layouts) — it will be on screen *at the same
  time* as the Focus Mode overlay. Both must reflect the same active entry.

## Schema change

Add to `TimeEntry`:

```prisma
description String?
```

Migration: `npx prisma migrate dev --name add_time_entry_description`.

## Shared hook

Extract `BillingTimerWidget.tsx`'s active-entry/tick/start/stop logic into
`src/hooks/useBillingTimer.ts`:

```ts
function useBillingTimer(): {
  active: ActiveEntry | null;   // { id, organizationId, startTime, endTime, description }
  elapsed: number;              // seconds, ticks every 1s while active
  loading: boolean;
  start(organizationId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  stop(description?: string): Promise<{ ok: true } | { ok: false; error: string }>;
}
```

- Fetches the active entry on mount (`GET /api/time-entries`).
- On successful `start`/`stop`, dispatches `window.dispatchEvent(new Event('billing-timer:changed'))`.
- Every hook instance also subscribes to that event and re-fetches the
  active entry when it fires — this is how `BillingTimerWidget` (mounted in
  the layout) and the Focus Mode embedded widget (mounted in the overlay)
  stay in sync without polling or a shared store.

`BillingTimerWidget.tsx` is refactored to consume the hook (same UI/props,
internals only).

## API change

`PATCH /api/time-entries/[id]` (`src/app/api/time-entries/[id]/route.ts`):
body becomes `{ action: 'stop', description?: string }`. When present,
`description` is included in the `update` call alongside `endTime`/
`durationSeconds`. No other route changes — reusing start/stop keeps the
single-active-entry invariant intact instead of introducing a second write
path.

## FocusModeOverlay.tsx changes

- `FocusOverlayTask` gains `organizationId: string | null`. `FocusTask` in
  `page.tsx` gains the same field (data already flows from the API; this is
  type-only plumbing).
- New local state: `autoStart` boolean, initialized from
  `localStorage.getItem('focusMode.autoStartTimer')` (default `true`),
  toggled via a small switch near the timer widget, persisted back to
  `localStorage` on change.
- New embedded `FocusModeTimerWidget` component (`src/components/admin/FocusModeTimerWidget.tsx`),
  rendered inside the overlay above the Done button. Uses `useBillingTimer`.
  States:
  - No `task.organizationId`: static "No client assigned — time won't be tracked" row, no timer.
  - `autoStart` off: static "Auto-start disabled" row with the toggle, no auto actions (matches requirement's "or prompt with a toggle" alternative).
  - Active entry running for `task.organizationId`: live `mm:ss` elapsed, no rate.
  - Attempted start hit 409 (another client's entry already running): toast `"Timer already running for another client — stop it to auto-track this task"`, widget shows idle state, no retry loop.
- Task-change effect (fires on mount and whenever `task?.id` changes —
  covers Next/Previous and the auto-advance after Done): if an entry is
  currently running for the *outgoing* task's `organizationId`, stop it with
  a description built from that task's subtask state (see below), then, if
  `autoStart` and the *incoming* task has an `organizationId`, start a new
  entry for it. Guarded so it's a no-op when there's nothing to stop/start.
- `handleDone`: before the existing confetti/`onComplete`/queue-advance
  logic, if a timer is running for the current task, stop it with the
  description, awaited, then proceed exactly as today.
- Close (X button / Escape): same stop-with-description as task-change,
  then call the existing `onClose`.
- Description format: `Worked on ${task.title}: Completed ${doneCount} micro-step${doneCount === 1 ? '' : 's'}`
  when `task.subtasks` is non-empty, else `Worked on ${task.title}`.
  `doneCount` = subtasks where `done === true` at the moment of stopping.

## Out of scope

- Hourly rate / billable-amount display or storage anywhere.
- Per-task (as opposed to single global) concurrent timers.
- A true pause/resume state distinct from stop/start — the API only
  supports start/stop, so "pause" is implemented as stop-and-log, "resume"
  as a fresh entry. No new schema state invented for this.
- Editing/deleting time entries from Focus Mode.

## Testing

`tsc --noEmit` must pass. No new automated test infra (none exists for
sibling components).
