# ADHD Brain Dump + Surprise Me — Design

Date: 2026-08-17

## Purpose

Add two executive-function features to the ADHD Task Checklist
(`/admin/tasks`):

1. **Brain Dump** — paste or dictate a raw block of text, AI parses it into
   clean tasks with micro-subtasks already attached.
2. **Surprise Me** — pick one task at random (weighted toward priority),
   launch Focus Mode on just that task, hiding the rest of the list.

## Existing patterns reused

- `POST /api/tasks/breakdown` (`src/app/api/tasks/breakdown/route.ts`) is the
  established AI micro-chunk pattern: `GoogleGenAI` (`@google/genai`,
  `gemini-3.6-flash`), `requireOwner()` cookie check, JSON-schema
  `responseSchema`, `dynamic = 'force-dynamic'`. Brain Dump's route follows
  the same shape.
- `Task` model (`prisma/schema.prisma:632`) already has everything needed:
  `title`, `status`, `priority`, `dueDate`, `subtasks Json?` (shape
  `{id, title, done}[]`, per existing comment on line 643). No schema
  changes.
- `FocusModeOverlay` (`src/components/admin/FocusModeOverlay.tsx`) already
  accepts an arbitrary `tasks` array + `startIndex` and disables Prev/Next
  at the array boundaries. Surprise Me reuses it unmodified by passing a
  single-element array — no overlay changes needed.

## 1. Brain Dump

### API: `POST /api/tasks/brain-dump`

- `src/app/api/tasks/brain-dump/route.ts`, mirrors `breakdown/route.ts`:
  `requireOwner()`, `GEMINI_API_KEY` check, `dynamic = 'force-dynamic'`.
- Body: `{ text: string }`. 400 if empty/whitespace.
- One `ai.models.generateContent` call, `gemini-3.6-flash`, system prompt:
  parse the raw text into a numbered list of distinct actionable tasks (max
  10), and for each task produce 3-5 tiny frictionless sub-steps (same
  ADHD-friendly constraints as the breakdown prompt: concrete, ≤10 min, zero
  decision-making). `responseSchema`:
  ```
  { tasks: [{ title: string, subtasks: string[] }] }
  ```
- Server creates rows in one `prisma.$transaction`, mapping each parsed task
  to `prisma.task.create({ data: { title, subtasks: steps.map(s => ({id: crypto.randomUUID(), title: s, done: false})) } })`.
  No `organizationId`/`priority`/`dueDate` inference — defaults, matching
  today's Quick Add behavior. Out of scope; not asked for.
- Response: `{ tasks: Task[] }` (created rows). Any Gemini/parse failure →
  500, nothing committed (transaction).

### UI: Brain Dump modal

- New `BrainDumpModal.tsx` under `src/components/admin/`.
- Trigger: new button next to the Quick Add form on
  `src/app/(admin)/admin/tasks/page.tsx` ("🧠 Brain Dump").
- Modal: textarea, mic toggle button, "Parse into Tasks" submit button
  (disabled while empty or while a request is in flight).
- Mic toggle: browser-native `SpeechRecognition` /
  `webkitSpeechRecognition` (feature-detected; button hidden entirely if
  unsupported — no polyfill, no server transcription). Interim + final
  results append into the same textarea the user can still hand-edit before
  submitting.
- On submit: `POST /api/tasks/brain-dump`, on success close modal, call the
  page's existing `load()` to refresh the board, `toast.success('Added N
  tasks')`. On failure: `toast.error`, modal stays open with the typed text
  intact.

## 2. Surprise Me

- New button in the existing button row (`page.tsx`, next to "Top 3 Focus" /
  "Focus Mode"): "🎲 Surprise Me", disabled when `openTasks.length === 0`
  (same disabled pattern as the existing Focus Mode button).
- New state: `pickedTaskId: string | null`.
- Click handler: weighted-random pick from `openTasks`
  (`weight = priority + 1`, cumulative-sum selection so higher-priority
  tasks are proportionally more likely but nothing is excluded); sets
  `pickedTaskId` to the chosen task's id and `focusOverlayIndex` to `0`
  (reusing the existing overlay-open state).
- Render: when `pickedTaskId` is set, `FocusModeOverlay` receives
  `tasks={openTasks.filter(t => t.id === pickedTaskId)}` instead of the full
  `openTasks` list — Prev/Next disable automatically since the queue length
  is 1. Otherwise unchanged (full list, existing Focus Mode / `?focus=1`
  behavior untouched).
- Close handler (`onClose`) clears both `focusOverlayIndex` and
  `pickedTaskId`.

## Error handling

- Brain Dump: empty text blocked client-side; Gemini/parse failure is an
  all-or-nothing transaction, toast-only error, no partial tasks.
- Surprise Me: no-op (button disabled) when there are no open tasks.

## Out of scope

- No priority/due-date inference from brain-dump text.
- No voice fallback for non-Chromium browsers.
- No persistence of "surprise me" picks (purely client-side, ephemeral).

## Testing

- `tsc --noEmit` clean.
- Manual: dump a multi-line block of text, confirm N tasks appear with
  subtasks pre-filled; click Surprise Me repeatedly, confirm only one task
  shows and Prev/Next stay disabled; close and confirm the full board
  returns unchanged.
