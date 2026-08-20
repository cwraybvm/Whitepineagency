# To-Do Completion, Rollover & Discipline Score Integration — Design

## What already exists (checked before building anything)
Researched `src/app/(admin)/admin/tasks/page.tsx` (1333 lines, the "Bingo" ADHD task board) before touching it:
- **Completion toggle already works end-to-end.** `toggleComplete` → `PATCH /api/focus-tasks/[id]` with `status`; the server sets `completedAt: status === 'DONE' ? new Date() : null` (`[id]/route.ts:42`) — item 1's "tapping toggles `isCompleted`/`completedAt`" is already true today, just spelled `status === 'DONE'` instead of a redundant boolean. Not adding an `isCompleted` field — it would duplicate `status` and the two could drift out of sync.
- **A different "stale" already exists** (`src/lib/staleTasks.ts`, `/api/focus-tasks/stale`) — 7-days-since-`updatedAt`, unrelated to scheduling. Confirmed no existing code checks "`scheduledAt` is in the past" anywhere — rollover is a clean gap, not a duplicate.
- **`dueDate` is dead** (always null, never read). `scheduledAt` is the field actually driving date UI — rollover keys off `scheduledAt`, not `dueDate`, despite the spec naming `scheduledDate`.
- **No "Show Completed Tasks" toggle exists.** The DONE Kanban column currently always renders every completed task with no way to hide them.
- Card styling only applies `text-gray-500 line-through` to the title on `DONE` — no dimmed card background, no checkmark badge beyond the round toggle itself.

## 1. Show Completed Tasks toggle
`showCompleted` state, default `false`. One-line change to the existing column filter (`page.tsx:1196`): `t.status === col.id && !t.isParked && (col.id !== 'DONE' || showCompleted)` — same change mirrored in the mobile column-count line (`page.tsx:1179`). A toggle button added to the existing toolkit dropdown menu, styled exactly like the adjacent "Low-Battery Mode" toggle (`page.tsx:927-938` — same ON-indicator pattern). Completed cards get `opacity-60` on the outer card div plus a small "✓ Completed" pill (same badge convention as the existing `scheduledAt` pill) — additive polish on top of the already-working strikethrough, not a rebuild.

## 2. Rollover engine
New field: `Task.rolloverCount Int @default(0)`.

Processed as a side effect of `GET /api/focus-tasks` (same "read triggers a write-back" pattern as the Drop-Off Route geocode cache and the goal-progress cache) — no cron/background job infrastructure exists in this app, and adding one for a single field is out of scope. On each load: for every open (`status !== 'DONE'`, `!isParked`) task whose **effective date** (`scheduledAt ?? createdAt`) is before today's midnight, `updateMany` sets `scheduledAt` to today and increments `rolloverCount`. This is naturally idempotent within a day — once rolled, `scheduledAt` becomes today, so the same task won't re-qualify again until the next real day boundary — and it directly satisfies "roll the task over to Today's Checklist," since `scheduledAt === today` *is* how "today's tasks" are identified everywhere else in this design (the discipline-score bonus below, and the existing `📅` scheduled badge already reads `scheduledAt`).

One accepted tradeoff: mutating `scheduledAt` on rollover means the task's *original* scheduled day is lost — a task first scheduled for Monday, still open Thursday, now reads as "scheduled today" with `rolloverCount: 3`. That's the intended behavior (spec: "roll over to Today's Checklist"), not a bug, but it does mean nothing can retroactively reconstruct "what was scheduled for Monday" after the fact — noted here rather than silently.

Badge: `🔥 Rolled Over ({rolloverCount} Days Stale)`, shown on the card whenever `rolloverCount > 0 && status !== 'DONE'` — disappears once the task is completed or genuinely caught up to a rollover-free day.

## 3. Discipline score bonus
Scoped narrowly: the spec names "the Daily Operational Discipline Score (0–100%)" — that's specifically the hero-ring score on `/admin/consistent-discipline`, which already has a tested, verified 5-component formula (20% each, confirmed against a hand-worked example in an earlier task this session). **Not** touching `/api/bvm/weekly-digest`'s separate 7-day-average score: recomputing it per-day would need to know what a task's `scheduledAt` *was* on each historical day, and rollover's own mutation of `scheduledAt` destroys exactly that history — retrofitting it accurately isn't possible without a schema addition nobody asked for, so the parenthetical's second location name is treated as "wherever the formula lives" (it lives in `bvmTargets.ts` constants used by the hero ring), not a mandate to touch both call sites.

Implemented as an **additive bonus**, not a re-weighting of the existing 5 components (the spec explicitly offers "core or bonus" — bonus preserves the already-verified 100-point base instead of shrinking each existing component to make room, which would be a regression risk to something already tested):

```
taskBonus = todaysTasks.length > 0
  ? TASK_BONUS_MAX * (todaysTasks.filter(completed).length / todaysTasks.length)
  : 0
dailyScore = min(100, round(existingFiveComponentScore + taskBonus))
```

`TASK_BONUS_MAX = 10` (new `bvmTargets.ts` constant). "Today's tasks" = `Task` rows where `scheduledAt`'s calendar day is today and `organizationId: null` — scoping to `null` specifically excludes agency-client project tasks (which carry a real `organizationId`) from a personal/BVM discipline score, the same `organizationId: null` convention already used for Expense/mileage throughout this session. The consistent-discipline page already fetches from `/api/focus-tasks` being unnecessary — it now also fetches that list (same OWNER-gated endpoint the tasks board already uses) purely to compute this bonus client-side; no new API route needed.

Rolled-over tasks land at `scheduledAt = today` by the mechanism in §2, so completing one is automatically counted in `todaysTasks` — this is what makes "completing a rolled-over task contributes directly to today's active discipline score recovery" true without any special-casing.

## Out of scope
- No retroactive weekly-digest task scoring (see §3's reasoning).
- No manual rollover-count reset/undo control (wasn't asked for).
