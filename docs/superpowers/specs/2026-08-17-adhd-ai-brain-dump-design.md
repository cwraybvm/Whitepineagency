# ADHD AI-Powered Brain Dump — Design

Date: 2026-08-17

## Purpose

Replace the existing one-click Brain Dump (parses raw text, immediately
creates tasks) with a review-first flow: parse with AI, show an editable
table, let the user confirm/edit/deselect before anything is created —
more ADHD-friendly (nothing lands on the board without a look), and infers
energy level, time estimate, and today-urgency per task. User confirmed
replacing the existing flow in-place rather than running two parallel
Brain Dump paths.

## Provider: OpenAI, reusing existing prior art

`OPENAI_API_KEY` is already configured (`.env.local`) and already used by
`src/app/api/leads/analyze/route.ts` — a raw `fetch` to
`https://api.openai.com/v1/chat/completions`, `model: "gpt-4o-mini"`,
`response_format: { type: "json_object" }`. Neither the `openai` npm
package nor the Vercel AI SDK (`ai`) are installed anywhere in this repo.
The new route follows that exact established pattern instead of adding a
new dependency — satisfies "OpenAI" from the spec, zero new install, and
matches the one other place this codebase already calls OpenAI.

## 1. `POST /api/focus-tasks/parse-brain-dump`

- `src/app/api/focus-tasks/parse-brain-dump/route.ts`. `requireOwner()`
  cookie check, `dynamic = 'force-dynamic'` — same shape as every other
  route in this file family.
- Body: `{ prompt: string }` (per spec's field name). 400 if empty/missing.
- Calls OpenAI exactly like `leads/analyze/route.ts`: system prompt
  instructs it to split the raw stream-of-consciousness into up to 10
  distinct actionable tasks, and for each infer:
  - `title`: concise, actionable.
  - `energyLevel`: `"LOW"` / `"MEDIUM"` / `"HIGH"`.
  - `estimatedMinutes`: nearest of `5, 15, 30, 60, 120`.
  - `isFocusToday`: `true` if the text signals urgency/today priority.
- **Parse-only** — does not touch the database. This is the key behavior
  change from the old `/api/tasks/brain-dump` route (which created tasks
  server-side in a transaction); the new flow creates nothing until the
  user confirms in the UI.
- Server-side validation on the OpenAI response before returning it:
  `energyLevel` coerced to `null` if not one of the 3 values,
  `estimatedMinutes` coerced to `null` if not one of the 5 buckets,
  `isFocusToday` coerced to `Boolean(...)`, empty/missing titles dropped,
  capped at 10 tasks. `response_format: json_object` guarantees valid JSON
  but not a specific shape, so this validation is load-bearing, not
  redundant.
- Response: `{ tasks: ParsedTask[] }`.

## 2. Shared constants: `src/lib/taskFields.ts`

`tasks/page.tsx` already has `ENERGY_LEVELS`, `ENERGY_META`,
`DURATION_OPTIONS`, `formatDuration` as local consts. The new modal needs
the identical energy/duration option sets for its review-table pickers —
duplicating them would mean two places to update if the bucket values or
badge colors ever change. Pulled into `src/lib/taskFields.ts`
(`EnergyLevel` type, `ENERGY_LEVELS`, `ENERGY_META`, `DURATION_OPTIONS`,
`formatDuration`, `nextEnergyLevel`, `nextDuration`); `tasks/page.tsx`
refactored to import from there instead of defining them inline
(behavior-preserving, no visual change).

## 3. `BrainDumpModal.tsx` — rewritten in place

- Textarea + mic dictation (`SpeechRecognition`) unchanged.
- Submit button becomes "✨ AI Parse Tasks", calls
  `POST /api/focus-tasks/parse-brain-dump` instead of the old route.
- On success, switches to a **review step** instead of closing: a table of
  the parsed tasks, each row:
  - Include checkbox, checked by default.
  - Editable title (`<input>`).
  - Energy 3-button picker (reusing `ENERGY_META` from `taskFields.ts`).
  - Duration 5-chip picker (reusing `DURATION_OPTIONS`).
  - "Focus today" checkbox, seeded from the AI's `isFocusToday` guess but
    user-editable.
- "Import Selected Tasks" button: for each checked row, `POST
  /api/focus-tasks` with `{title, energyLevel, estimatedMinutes}` (the
  existing route's accepted fields — unchanged, no new fields added to
  it). Then, for the checked rows also flagged "Focus today", `PATCH
  {isFocusToday: true, focusOrder}` on the newly-created ids — capped at
  the app's existing 3-max Top 3 Focus rule
  (`toggleFocus`/`tasks/page.tsx`). A new `focusTodayCount` prop (current
  count of `isFocusToday` tasks, passed from the page) tells the modal how
  much headroom remains; extra flagged rows beyond the cap are silently
  skipped, same silent-no-op convention `toggleFocus` already uses at the
  cap today.
- `onImported(count)` replaces the old `onCreated(count)` callback —
  parent (`tasks/page.tsx`) does the same `load()` + toast + close it
  already does today, just renamed for clarity since creation now happens
  in two steps (create, then flag) rather than one.

## Cleanup: delete the superseded Gemini route

`src/app/api/tasks/brain-dump/route.ts` (Gemini, auto-subtask generation,
instant-create) becomes dead code once the modal no longer calls it —
deleted rather than left unreferenced. Its micro-subtask generation isn't
in the new spec's field list; per-task subtasks can still be added
afterward via the existing "Break Down" button already on every card
(`/api/tasks/breakdown`, unrelated route, untouched).

## Error handling

- Empty/whitespace prompt: blocked client-side (submit disabled), same as
  today.
- OpenAI call/parse failure: toast error, stays on the textarea step with
  the typed text intact (same recovery behavior as today).
- Zero tasks parsed: treated as a failure case (toast, stay on textarea)
  rather than showing an empty review table.
- Per-row `POST`/`PATCH` failures during import: best-effort — a failed
  row doesn't block the others; final toast reflects how many actually
  landed (`load()` afterward reflects DB truth either way).

## Out of scope

- No AI-inferred subtasks (removed along with the old route).
- No due-date/priority inference.
- No retry/partial-import UI beyond the best-effort behavior above.

## Testing

- `tsc --noEmit` clean.
- Manual: dump a multi-line block of mixed-urgency text, confirm the
  review table shows sensible energy/duration/focus-today guesses;
  edit a title, toggle a checkbox off, import; confirm only checked rows
  land on the board, confirm Focus-today flags respect the 3-max cap when
  more than 3 rows are flagged and/or Top 3 already has entries.
