# ADHD "Unstick Me" — Design

Date: 2026-08-17

## Purpose

Add an always-available AI button on task cards that appends 3 concrete,
low-friction micro-steps to a task — for when a task feels too big/vague
to start, at any point, not just before any subtasks exist. User confirmed
this replaces the existing "Break Down" feature everywhere rather than
running alongside it.

## Relationship to the existing "Break Down" feature (resolved)

Every card already has an AI subtask button (`breakDownTask` /
`/api/tasks/breakdown`, Gemini), on both the Kanban card and inside
`FocusModeOverlay`. It only renders when a task has **zero** subtasks, and
it **replaces** `subtasks` with 3-5 new ones. "Unstick Me" is the same
underlying concept done better: always visible, **appends** instead of
replacing, and uses OpenAI (matching the convention just established for
Brain Dump). User confirmed: replace it everywhere, delete the old route —
same move as retiring the Gemini Brain Dump route last round.

## 1. `POST /api/focus-tasks/[id]/unstick`

- `src/app/api/focus-tasks/[id]/unstick/route.ts`. `requireOwner()`,
  `dynamic = 'force-dynamic'` — same shape as the rest of this route
  family.
- No request body needed — the task id comes from the URL param; the
  route fetches the task itself via `prisma.task.findUnique`. 404 if not
  found.
- OpenAI call: same raw-fetch pattern as
  `/api/focus-tasks/parse-brain-dump` (`gpt-4o-mini`,
  `response_format: json_object`). System prompt asks for exactly 3
  concrete, low-friction micro-steps for the given task title, each
  requiring zero decision-making to begin — same ADHD-friendly
  constraints already used by the old breakdown prompt. The task's
  **existing subtask titles are included as context** ("already-planned
  steps, don't repeat these") so repeated clicks don't generate
  duplicates — a natural fit given the append (not replace) semantics
  make repeated clicks a real usage pattern.
- Response shape: `{"steps": [string, string, string]}`. Validated
  server-side same as the other AI routes (`json_object` guarantees valid
  JSON, not this specific shape): non-empty strings, capped/padded to
  exactly what's usable, dropped if empty.
- New steps become `{id: crypto.randomUUID(), title, done: false}`
  entries **appended** to the task's existing `subtasks` array (`[]` if
  it was `null`), persisted via `prisma.task.update`. Returns the updated
  `Task` row so the client can apply it directly.

## 2. Client wiring — `tasks/page.tsx` + `FocusModeOverlay.tsx`

- `tasks/page.tsx`: `breakingDownId` state and `breakDownTask` function
  renamed to `unstickingId` / `unstickTask` (the underlying action
  changed meaningfully, worth the rename for clarity). `unstickTask`
  `POST`s the new route, applies the returned task's `subtasks` directly
  to local `tasks` state — no `load()` call, per the "immediately render
  ... without full-page reloads" requirement.
- Card UI: the button is no longer gated on `!t.subtasks?.length` — the
  checklist (if any subtasks exist) renders first, then the button always
  renders beneath it. Relabeled "Unstick Me" with a `Lightbulb` icon
  (`lucide-react`), matching the icon+text convention every other button
  in this header/card system already uses (Package, Wind, Shuffle,
  PieChart, etc.) rather than a literal emoji glyph.
- `FocusModeOverlay.tsx`: its own dashed "Break into Micro-Steps" button
  (currently also gated on `!task.subtasks?.length`, wired to the
  `onBreakDown` prop which is `unstickTask` passed down from the page)
  gets the same treatment — always visible, same new label/icon. The prop
  name `onBreakDown` is left as-is (just a callback identifier); only what
  it points to and the button's visibility/label change.
- Old `/api/tasks/breakdown/route.ts` (Gemini) deleted — no longer
  referenced by either surface once both call the new route.

## Error handling

- Same convention as the rest of this route family: toast on failure via
  the calling UI's existing error handling, task/card state unchanged on
  failure (no partial/garbage subtasks appended if the OpenAI call or
  validation fails).

## Out of scope

- No cap on how many times a task can be "unstuck" (repeated appends are
  allowed by design — the "don't repeat these" context is the mitigation
  for duplicate steps, not a hard limit).
- No manual reordering of appended vs. original subtasks.

## Testing

- `tsc --noEmit` clean.
- Manual: click Unstick Me on a task with no subtasks (3 steps appear),
  click again (3 more appended, no duplicates of the first 3), confirm the
  same behavior works identically from inside Focus Mode's overlay,
  confirm no full-page reload/flicker on either surface.
