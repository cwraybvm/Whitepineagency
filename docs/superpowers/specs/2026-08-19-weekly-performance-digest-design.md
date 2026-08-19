# Weekly Performance & Discipline Digest — Design

## `/api/bvm/weekly-digest`
`?date=YYYY-MM-DD` (default today) selects which Sunday-start week via the existing `weekRange()` helper — same convention as BVM Reports' weekly discipline section, so "the week" means the same thing everywhere in this app.

Sources (all already-existing models, no schema change):
- `BvmCallLog` rows in range → per-day filled-cell counts (for the daily-score average) and totals: `totalCalls`, `totalLvmGk` (`LMGK + LVM` status counts — spec's own grouping), `totalInfoGathered` (`I` status count), `leadsAdded` (sum of `leadsAdded`).
- `ConsistentDisciplineLog` rows in range → per-day `pagesRead`/`waterGlasses` (for the daily-score average) and totals: `totalPagesRead`, `totalWaterGlasses`, `jiuJitsuCompleted` (count where `jiuJitsu`), `workoutsCompleted` (count where `workout`).
- `BvmAppointment.count()` where `date` in range → `appointmentsSet` — same definition BVM Reports' `funnel.appointmentsScheduled` already uses, for consistency between the two pages that will both show this number.
- `BvmClientKanban.count()` where `stage: 'Magazine Dropped'` and `lastContacted` in range → `dropOffsCompleted`. `lastContacted` is the completion timestamp here specifically because `mark-dropped-off` (built earlier this session) sets it at the moment of completion — reusing that existing link rather than adding a new "completed at" field.
- `Expense` rows (`type: 'MILEAGE'`, `organizationId: null`) in range → `totalMiles`, `totalDeduction` (sum of stored `amount`, not a recomputed `miles × rate` — consistent with how the Expenses page's own YTD figures already work).

**Discipline Compliance Score**: spec says "average daily discipline score" — computed as the existing Consistent Discipline hero-ring formula (20% each: calls/target, pages/target, water/target, Jiu-Jitsu weekly-pace, workout weekly-pace) evaluated once per day of the week, then averaged. The Jiu-Jitsu/workout terms are identical across all 7 evaluations (they're inherently week-scoped), so this reduces to the week's Jiu-Jitsu/workout credit plus the day-by-day average of the calls/pages/water terms — but computing it as 7 literal daily scores and averaging (rather than the mathematically-equivalent shortcut) matches the spec's own wording exactly and is easier to verify against the existing per-day formula.

`WEEKLY_LEADS_TARGET` (new constant, `src/lib/bvmTargets.ts`) = `LEADS_TARGET × 5` = 50 — matches the spec's own worked example (`38 / 50 Goal`) exactly, and 5 (business days) is a more realistic weekly-pace multiplier than 7.

## Copy Weekly Digest Text
`src/lib/weeklyDigestText.ts#buildWeeklyDigestText()` formats the exact template from the spec, verbatim — including which fields it omits: `totalLvmGk`/`totalInfoGathered` are real fields in the API response (item 1 asks for them as computed metrics) but don't appear in the spec's own literal example text, so the text builder doesn't invent lines the example didn't show. A ✅ appears next to Jiu-Jitsu/Workouts only when the count meets its target (the example only shows the success case; omitting it otherwise, rather than inventing a fail-state marker the spec never specified).

`src/components/admin/CopyWeeklyDigestButton.tsx` — one shared component (not duplicated markup) used on both `/admin/consistent-discipline` and `/admin/bvm/reports`, since the spec asks for the identical action in both places: fetches `/api/bvm/weekly-digest`, builds the text, copies to clipboard, toasts.

## Out of scope
- No persisted "digest sent" history — this is a copy-to-clipboard action, not a scheduled send.
