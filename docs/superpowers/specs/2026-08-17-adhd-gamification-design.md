# ADHD Task Gamification — Confetti + Streak — Design

Date: 2026-08-17

## Purpose

Add celebratory feedback and daily-momentum tracking to the ADHD Task
Checklist (`/admin/tasks`) — confetti on completion, a visible streak
counter — same family as Brain Dump / Surprise Me / Ambient Audio /
Dopamine Reset / Energy Filtering already shipped.

## 1. Confetti

### Already exists

`canvas-confetti` and `@types/canvas-confetti` are already dependencies
(`package.json:27,60`) and `FocusModeOverlay.tsx` already fires a burst in
`handleDone()` before calling `onComplete`. No install needed.

### New trigger: drag-to-Done on the board

`handleDragEnd` in `tasks/page.tsx` currently silently PATCHes status on
drop. Add a burst when a card lands in the Done column, guarded so it only
fires on an actual move *into* Done, not on reordering cards that are
already there:

```ts
if (result.destination.droppableId === 'DONE' && result.source.droppableId !== 'DONE') {
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
}
```

Same params `FocusModeOverlay.tsx` already uses, for a consistent feel.

### Subtasks: no confetti

Subtask checkboxes can be ticked many times per task; bursting on each
would be noisy during a focus session, not celebratory. Only full-task
completion triggers confetti — both paths (drag-to-Done, Focus Mode Done)
now covered.

## 2. Daily Completion Streak

### Storage: localStorage

No per-task-board user scoping exists today (single OWNER-gated admin, no
`userId` on `Task`), so a streak is inherently one global counter, not
per-person. Stored client-side in `localStorage`, matching the existing
precedent in this exact codebase (`FocusModeOverlay.tsx`'s
`focusMode.autoStartTimer` setting). No new schema, no new API route.

### New file: `src/lib/taskStreak.ts`

```ts
interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null; // 'YYYY-MM-DD', local date
}
```

- `getTaskStreak(): StreakState` — reads `localStorage['taskStreak']`,
  defaults to `{currentStreak: 0, longestStreak: 0, lastCompletionDate: null}`
  if absent/unparsable.
- `recordTaskCompletion(): StreakState` — call on every full-task
  completion:
  - `today` = local date as `YYYY-MM-DD`.
  - If `lastCompletionDate === today`: no-op (already counted today,
    idempotent against multiple completions same day).
  - Else if `lastCompletionDate` is exactly yesterday: `currentStreak += 1`.
  - Else (gap of 2+ days, or first-ever completion): `currentStreak = 1`.
  - `longestStreak = max(longestStreak, currentStreak)`.
  - `lastCompletionDate = today`, persist, return new state.

### Wiring in `tasks/page.tsx`

- New state `streak: StreakState`, initialized from `getTaskStreak()` on
  mount.
- `completeTask()` (used by Focus Mode's `onComplete`) calls
  `setStreak(recordTaskCompletion())` — no confetti call here, the overlay
  already fired its own.
- `handleDragEnd()`'s Done-guard (above) calls both the new `confetti()`
  invocation and `setStreak(recordTaskCompletion())`.

### Display

Badge "🔥 {currentStreak}-Day Streak" next to the "Tasks" title in the page
header (`tasks/page.tsx`, alongside the existing `ListTodo` icon/heading).
Hidden entirely when `currentStreak === 0` — nothing to celebrate yet, avoid
a permanent "🔥 0-Day Streak" fixture.

## Error handling

- `localStorage` read/write wrapped in try/catch (private browsing /
  storage-disabled edge case) — falls back to in-memory-only state for
  that session, no crash.

## Out of scope

- No server-side/cross-device streak persistence.
- No streak-break notifications or reminders.
- No subtask-level confetti.

## Testing

- `tsc --noEmit` clean.
- Manual: complete a task via Focus Mode (confetti fires, streak badge
  appears/increments once), complete a task via drag-to-Done (confetti now
  fires too, streak doesn't double-increment same day), reorder within
  Done column (no confetti).
