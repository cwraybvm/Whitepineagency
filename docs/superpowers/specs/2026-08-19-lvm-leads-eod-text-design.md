# LVM Color, Leads Added Tracker, EOD Text Format — Design

## 1. LVM theme color: purple → blue
Color is single-sourced in `src/lib/bvmStatus.ts` (`BVM_STATUS_OPTIONS`), consumed by the call-consistency grid, its pie chart + custom legend, the daily-breakdown list, the re-engagement queue, and BVM Reports' bar chart — all read `o.color`/`BVM_STATUS_COLOR`, none hardcode purple. Change `LVM`'s `color` from `#A855F7` to `#3B82F6` (blue-500, matches the spec's Tailwind `bg-blue-500` swatch) — every consumer picks it up automatically.

`NA` (`#8B5CF6`, Violet) is a separate status with its own hex and is out of scope — the spec's ask is LVM only, not "anything purple-ish."

`STATUS_EMOJI` in `call-consistency/page.tsx` (SMS clipboard summary only) maps `LVM: '🟪'` — updated to `'🟦'` to match the new blue theme (cosmetic, not covered by the shared color map).

`BvmReportsPage`'s `FUNNEL_COLORS` includes `#A855F7` as the "Closed Deals" funnel-stage color — unrelated to LVM (funnel stages aren't status-colored), left untouched.

## 2. Leads Added tracker
**Schema:** `BvmCallLog` gets `leadsAdded Int @default(0)`. Same upsert-per-day row the call grid already uses — no new table.

**Call Consistency page:** new card next to the existing Call Pace card — Target Icon, "Leads Added Today" — `-`/`+` buttons (clamped ≥0) plus a progress bar against a `LEADS_TARGET = 10` constant, label `${leadsAdded} / 10 Leads Added — ${pct}%`. Changes go through the same `scheduleSave` debounce as cell edits (already 600ms, already guards against saving over an unloaded date) — `scheduleSave` signature extended to also carry `leadsAdded`, and the PUT body includes it.

**API:** `/api/bvm/call-log` GET's synthetic empty-day default gets `leadsAdded: 0`; PUT accepts and upserts `leadsAdded`.

**Reports:** `/api/bvm/reports` sums `leadsAdded` across the window's `BvmCallLog` rows, returns `leadsAddedTotal` and `leadCallConversionRate` (`leadsAddedTotal / totalCalls`, 0 when `totalCalls` is 0). `BvmReportsPage` gets a 5th summary tile, "Leads Added" (`leadsAddedTotal`) plus the conversion rate shown beneath it — reuses the existing summary-tile grid (goes to `md:grid-cols-5`) rather than a new component, and works unchanged across all four range tabs (daily/weekly/monthly/yearly) since it's driven by the same date-window query every other tile already uses.

## 3. EOD text summary reformat (clipboard only — the email body in `sendEodSummary` is unchanged)
`copyEodTextSummary`'s `statusLine` currently reads `${STATUS_EMOJI[o.value]} ${o.label}: count` where `o.label` is the raw status code (`I`, `LMGK`, `LVM`, `NA`). A local `SMS_STATUS_LABEL` map (scoped to this function, not `bvmStatus.ts`, since the grid/legend/reports must keep showing the compact codes) supplies the full label only for this clipboard string:

```
I    -> Info Gathered
LVM  -> Voice Mail Left
LMGK -> Left Message with GK
NA   -> No Answer
```
(`Yes`/`No` are already plain English — untouched.)

Add a `🎯 Leads Added: ${leadsAdded} / 10` line. Remove the `🗓️ Appts Booked` and `🏠 New Addresses` lines entirely (and their now-unused `appointmentsToday`/`addressesToday` fetches inside `fetchEodData` — dropped from that function since `sendEodSummary`'s email body is the only other caller and it still needs them, so `fetchEodData` stays as-is and `copyEodTextSummary` just stops reading those two fields from its result).

Target clipboard format (confirmed with user against a reconstruction, since the original message's template was cut off):
```
📞 BVM EOD — {date}
✅ Calls: {filled}/{DAILY_TARGET}
🟦 Info Gathered: {n}  🟧 Left Message with GK: {n}  🟦 Voice Mail Left: {n}  🟪 No Answer: {n}  🟥 No: {n}  🟩 Yes: {n}
🎯 Leads Added: {leadsAdded} / 10
📅 Conference: {✅ Attended|❌ Missed} ({callType})
```
(status segments only render for statuses with count > 0, same as today; "No calls logged" fallback line preserved when none are.)

## Out of scope
- No change to the EOD *email* body (`sendEodSummary`) — spec says "clipboard text output ONLY."
- No change to `NA`'s color or the funnel chart's purple.
