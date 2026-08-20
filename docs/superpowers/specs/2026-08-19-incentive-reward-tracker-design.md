# Custom Goal & Incentive Reward Tracker — Design

## Schema: `RewardGoal`
Named `RewardGoal` (spec offered `rewardGoal` or `disciplineGoal`) — the six target types span both the discipline domain (`DISCIPLINE_SCORE_AVG`, `COMPOSITE_STREAK`) and BVM sales/field domain (`CALLS_COUNT`, `LEADS_ADDED`, `DROP_OFFS_COMPLETED`, `MILES_LOGGED`), so "discipline" would undersell half the feature.

`targetType`/`timeframe` are plain `String` fields with a comment listing the allowed values, not native Prisma `enum` — matching every other "enum-like" field already in this schema (`BvmClientKanban.stage`, `Expense.type`, `BvmConferenceCall.callType`, etc. — none of them use a real Prisma enum; introducing the first one here would be an inconsistent one-off).

```prisma
model RewardGoal {
  id           String   @id @default(uuid())
  title        String
  targetType   String   // CALLS_COUNT, DISCIPLINE_SCORE_AVG, LEADS_ADDED, DROP_OFFS_COMPLETED, MILES_LOGGED, COMPOSITE_STREAK
  targetValue  Float
  currentValue Float    @default(0)
  timeframe    String   // WEEKLY, MONTHLY, QUARTERLY, CUSTOM
  startDate    DateTime
  endDate      DateTime
  isUnlocked   Boolean  @default(false)
  unlockedAt   DateTime?
  rewardIcon   String
  claimed      Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([claimed])
  @@index([targetType])
}
```
`currentValue` is a write-through cache: `GET` recomputes it from the live source tables every call and persists the result (same "read triggers a write-back" pattern the Drop-Off Route geocode cache already uses) — so the stored value is never more than one `GET` stale, and `isUnlocked`/`unlockedAt` flip automatically the first time a `GET` observes `currentValue >= targetValue`. `claimed` is the archive flag ("claim/archive the reward once fulfilled") — separate from `isUnlocked` because a goal can be unlocked and still sitting there un-claimed.

## `currentValue` computation per `targetType`
All types except `COMPOSITE_STREAK` are a straight sum/average over `[startDate, endDate)`:
- `CALLS_COUNT` — filled-cell count across `BvmCallLog` rows in range (same definition used everywhere else this session).
- `LEADS_ADDED` — sum of `BvmCallLog.leadsAdded`.
- `DROP_OFFS_COMPLETED` — count of `BvmClientKanban` where `stage: 'Magazine Dropped'` and `lastContacted` in range (same drop-off-completion signal established earlier this session).
- `MILES_LOGGED` — sum of `Expense.miles` where `type: 'MILEAGE'`, `organizationId: null`, `date` in range.
- `DISCIPLINE_SCORE_AVG` — the existing daily-discipline-score formula (Call/Pages/Water/Jiu-Jitsu-pace/Workout-pace, 20% each) evaluated once per calendar day in range and averaged — generalized from the weekly-digest version to an arbitrary range: each day's Jiu-Jitsu/Workout "weekly pace" term is evaluated against *that day's own* Sunday-start week (via `weekRange`), so a month-long goal correctly rolls through 4-5 different weekly windows rather than treating the whole range as one week. Fetches discipline logs padded 6 days before `startDate` so week-boundary days at the start of the range can still see their full week.
- `COMPOSITE_STREAK` — doesn't fit the sum-over-range model (a streak is "consecutive days as of now," not bounded the same way); reuses `computeDailyStreak` from `disciplineStreaks.ts` with a composite predicate (`pagesRead>=target && waterGlasses>=target && jiuJitsu && workout` — the same "4/4 habits" concept BVM Reports' habit-compliance heat strip already uses), anchored at `min(endDate, today)` rather than the range's literal end (a streak "as of the future" isn't meaningful).

## API
- `GET /api/bvm/goals` — every `claimed: false` row (covers both still-active and unlocked-but-not-yet-claimed goals — a claimed one isn't "active" anymore, so it's excluded from the default list), `currentValue`/`isUnlocked`/`unlockedAt` refreshed and persisted as described above.
- `POST /api/bvm/goals` — `{ title, targetType, targetValue, timeframe, startDate?, endDate?, rewardIcon }`. For `WEEKLY`/`MONTHLY`/`QUARTERLY`, the server computes the canonical current-period range itself (ignores any client-sent dates) rather than trusting client date math — matches the range-resolution pattern already in `/api/bvm/reports`, extended with a `QUARTERLY` case it didn't have. `CUSTOM` requires both dates from the client.
- `PATCH /api/bvm/goals/[id]` — partial update (`title`/`targetValue`/etc. for editing) or `{ claimed: true }` to archive.

## UI
"🎁 Add Incentive Goal" button + its creation modal is a shared component (same reuse pattern as `CopyWeeklyDigestButton` from the previous task) on both pages — a goal can span either domain, so launching creation from whichever page you're already on makes sense regardless of where it later displays. Modal: title, target-metric dropdown, threshold number input, timeframe buttons (Custom reveals start/end date pickers), and an emoji selector — a small preset grid (🥋✈️⌚🎁🏆💰🎯🔥🚗📚) plus a free-text fallback input, not a full emoji-picker dependency.

The **live progress card grid** (item 3) is `/admin/consistent-discipline`-only, per the spec's own explicit page reference — `/admin/bvm/reports` gets the creation button but not the display grid. Each card: progress bar, a per-`targetType` formatted readout (`"342 / 500 Calls (68.4%)"` vs. `"88% / 90% Avg Discipline Score"` — percentage-type goals don't get a second `%` sign stacked on top of the ratio), and a "remaining" line. Unlocked-and-unclaimed cards get a `🎉 REWARD UNLOCKED!` badge, glowing border, a small CSS-only confetti burst (a handful of `@keyframes`-animated spans — no new dependency for a one-off celebration effect), and a "Claim Reward" button (`PATCH { claimed: true }`, removes the card from the list).

## Out of scope
- No push notification / toast the instant a goal unlocks outside of a page visit — unlock detection happens on `GET`, which only runs while the page is open (matches every other "computed on load" pattern in this app; a background job is a different feature).
- No goal deletion endpoint — "claim/archive" (the spec's own wording) covers the lifecycle end; a hard-delete UI wasn't asked for.
