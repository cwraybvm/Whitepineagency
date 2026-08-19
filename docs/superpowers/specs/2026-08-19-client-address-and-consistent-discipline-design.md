# Inline Address Creation + Consistent Discipline Portal — Design

## 1. Client Kanban modal — inline "+ Add New Address"
`bvm/clients/page.tsx`'s "Linked Address" `<select>` gets a toggle button next to it. Toggling reveals Street/City/State/Zip inputs (no `customerName` field — reuses `activeCard.clientName`, since this address belongs to this client) + a "Save Address" button.

On save:
1. `POST /api/bvm/drop-off-route/geocode-start` with the composed `"{street}, {city}, {state} {zip}"` string — reuses the existing endpoint (already built for the Drop-Off Route start-location field, geocodes any free-text address). Best-effort: on 422/failure, proceed without lat/lng rather than blocking — matches the Drop-Off Route page's existing "ungeocoded stops get a warning badge, don't block the flow" pattern.
2. `POST /api/bvm/addresses` with `{ customerName: activeCard.clientName, street, city, state, zip, lat, lng }`. The route currently destructures `customerName, street, city, state, zip, phone, publicationName, magazineZone` and never writes `lat`/`lng` even though the columns exist (added in the Drop-Off Route work) — extending its destructure + `create` call to pass them through when present.
3. `PATCH /api/bvm/clients` with `{ id: activeCard.id, addressId: <new address id> }` — the same call the existing dropdown's `onChange` already makes.
4. Append the new address to local `addresses` state (so the dropdown shows it immediately without a refetch) and collapse the inline form.

## 2. Consistent Discipline — schema
```prisma
model ConsistentDisciplineLog {
  id           String   @id @default(uuid())
  date         String   @unique // YYYY-MM-DD
  pagesRead    Int      @default(0)
  jiuJitsu     Boolean  @default(false)
  workout      Boolean  @default(false)
  waterGlasses Int      @default(0)
  notes        String?

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([date])
}
```
"Calls Made" is deliberately not a column here — it's read live from `BvmCallLog` (see below), not duplicated storage.

## 3. `/api/consistent-discipline`
- `GET ?date=YYYY-MM-DD` (default today): single-day object, synthetic zeroed default when no row exists yet — mirrors `/api/bvm/call-log`'s GET shape exactly (`{ id: null, date, pagesRead: 0, jiuJitsu: false, workout: false, waterGlasses: 0, notes: null }`).
- `GET ?start=&end=`: raw array of rows in `[start, end)` — used by the weekly report and by the daily page's own "this week" chips. No synthetic filling; the caller reduces over the known date list.
- `POST` (aliased as `PATCH`, same handler — spec allows either verb, one upsert body avoids duplicating the logic): `{ date, pagesRead?, jiuJitsu?, workout?, waterGlasses?, notes? }`, partial-update upsert — same convention as `/api/bvm/clients` PATCH (only provided fields are written; create fills the rest with schema defaults).

## 4. `/admin/consistent-discipline` page
Top-level nav entry in `AdminNav.tsx`'s `NAV_LINKS` (not `BVM_LINKS` — this is personal habit tracking, not BVM business), landing in the mobile "More" drawer alongside Reports/Analytics/CMO/Vault (not one of the 3 pinned mobile slots) since it's not top-3 traffic.

Date selection is a plain `<input type="date">` — every other BVM/reports page in this codebase already uses this for "pick any date," and it natively supports past and future dates. No calendar-grid component needed for "pick a date" (the spec's "heat map / weekly status calendar" visualization requirement lives in Reports, section 4 below — a different thing from date *selection*).

On date change, three parallel fetches:
- `/api/consistent-discipline?date=X` → today's pagesRead/jiuJitsu/workout/waterGlasses
- `/api/bvm/call-log?date=X` → Calls Made, computed as `cellData.filter(c => c.status).length` (same "filled" definition `call-consistency/page.tsx` already uses for its own "Calls Completed" tile)
- `/api/consistent-discipline?start=<weekStart>&end=<weekStart+7d>` → this week's rows, to show "Jiu-Jitsu: n/2 this week" and "Workout: n/2 this week" chips next to their toggles (the spec calls out "Target: 2 days/week" directly under each toggle, so surfacing the live weekly count there — not just in the separate Reports page — is the useful version of that requirement)

Controls, all auto-saving through `POST /api/consistent-discipline` on change (no separate save button, matches the call-consistency grid's auto-save convention):
- Calls Made: read-only tile (no input — it's sourced from the call log, not owned by this page)
- Pages Read: `-`/`+`/direct-entry + progress bar vs. 10 (same interaction shape as the Leads Added tracker on Call Consistency)
- Jiu-Jitsu Attended: toggle button, "n/2 this week" chip
- Workouts Completed: toggle button, "n/2 this week" chip
- Water Intake: `-`/`+` glass counter + progress bar vs. 7

## 5. Weekly Discipline section on BVM Reports
Added to `/admin/bvm/reports` (the only real reports dashboard that exists — `/admin/reports` is a bare `redirect("/admin")` stub, not a page that could host a new section). Runs independently of that page's existing daily/weekly/monthly/yearly range tabs — always shows the calendar week (Sun–Sat) containing the page's selected `date`, since "2 days/week" and "10 pages/day avg" targets don't scale meaningfully against a month or year window. Fetches `/api/consistent-discipline?start=<weekStart>&end=<weekStart+7d>`.

Renders:
- Jiu-Jitsu progress bar, `n / 2 days`
- Workout progress bar, `n / 2 days`
- Average daily Pages Read vs. 10 (sum ÷ 7, not ÷ rows-with-data — a day with no log is 0 pages, which should pull the average down, not be excluded)
- Average daily Water vs. 7 (same ÷7 rule)
- A 7-cell weekly status strip (Sun..Sat), each cell shaded by how many of the 4 habits hit target that day (`pagesRead>=10`, `waterGlasses>=7`, `jiuJitsu`, `workout` → 0-4), plain colored `div`s (no charting library — this is a heat strip, not a chart).

## Out of scope
- No calendar-month heat map grid (a 7-day strip satisfies "weekly status calendar" for a section titled "Weekly Discipline Report"; a month grid is a different, unrequested scope).
- No edit history/notes UI beyond the `notes` column existing in schema (spec lists it as a field but no UI control for it is requested in the daily-tracker bullet list — left for a future ask).
