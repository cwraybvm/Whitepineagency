# Appointments Maps + Mileage Expense Logging — Design

## Schema

**`BvmAppointment`**: + `appointmentTime String?` (e.g. `"10:30 AM"`, free text — matches the spec's own example format, no need for a separate time-picker type), + `address String?` (destination), + `startAddress String?` (per-appointment, form defaults it to the office address constant but it's editable/overridable per trip — not a DB-level default, since a DB default would silently apply even to appointments the form never touched). Back-relation `expenses Expense[]` for the new relation below.

**`Expense`** — reused as-is per the spec's own instruction ("creates a mileage entry directly in `prisma.expense`"), but two gaps block that:
1. `organizationId` is required, tied to a real `Organization` (a billable agency client). BVM mileage isn't billable to any agency client — it's White Pine's own internal operational deduction, and forcing it under a fake/reused org id would corrupt that client's expense totals on `/admin/clients/[id]`. Making `organizationId` (and its relation) **optional** — checked all 4 call sites that touch `prisma.expense`; every one filters `where: { organizationId: id }` for a specific client, so a null-org row simply never appears there. Safe, and it's the only schema change to an already-shared model.
2. No field records *what* the mileage was for — no client name, no memo. Adding `description String?` and an optional `appointmentId` + relation back to `BvmAppointment`, so the new Mileage Expenses log can show "linked client appointment" per the spec's own requirement, without re-deriving it from freeform text.

`category` (already a plain string on `Expense`) holds `"Business Mileage"` — satisfies "categorized under Business Mileage" with zero new enum/field.

## Constants
`src/lib/bvmTargets.ts` gets two additions: `BVM_OFFICE_ADDRESS = '700 Cedar Ave, Alexandria, MN 56308'` (the spec's own example, specific enough — a real street+city+zip, not a generic placeholder — to treat as the actual intended default rather than illustrative filler) and `IRS_MILEAGE_RATE = 0.67` (the exact rate the spec's own worked example uses).

## API
- `/api/bvm/appointments` GET/POST/PATCH: extended to read/write `appointmentTime`, `address`, `startAddress`.
- New `POST /api/bvm/appointments/log-mileage`: body `{ appointmentId, clientName, miles, date }` → `amount = round(miles * IRS_MILEAGE_RATE, 2)`, creates `Expense` with `organizationId: null`, `type: 'MILEAGE'`, `category: 'Business Mileage'`, `description: clientName`, `appointmentId`, `miles`, `amount`, `date`.
- New `GET /api/bvm/expenses`: `Expense.findMany({ where: { type: 'MILEAGE', organizationId: null }, include: { appointment: { select: { clientName: true, date: true } } } })` — scoped to BVM's own mileage bucket specifically, not mixed with any agency client's mileage expenses under the separate per-client Organization system.

## Distance calculation
Appointments don't have a lat/lng cache the way `BvmAddress` does, so each card geocodes its own `startAddress`/`address` pair (both via the existing `/api/bvm/drop-off-route/geocode-start`, as the spec names) **once on mount, cached in page state keyed by appointment id** — not re-fetched on every render, and only attempted when both addresses are present (an appointment missing either field just shows no distance badge rather than erroring, same "don't block, degrade gracefully" pattern the Drop-Off Route work already established). One-way distance is `haversineMiles` (already exported from `routeOptimizer.ts` — reused, not reimplemented); round trip is ×2.

## UI: Appointments page
The existing month-grid calendar is unchanged (still the click-a-day-to-add / click-a-chip-to-edit flow). The spec's "appointment card" concept — date/time badge, two map buttons, distance badge, Log Mileage button — doesn't fit inside the grid's small day-cell chips, so a new **"Upcoming Appointments"** card list is added below the grid, showing every appointment in the currently-viewed month as a full card:
- `📅 {Today|Tomorrow|Mon, Jan 5} at {appointmentTime}` badge.
- `🗺️ Open in Google Maps` / `🍏 Open in Apple Maps` — reuse the existing `buildGoogleMapsUrl`/`buildAppleMapsUrl` (already accept a start address + a stops array; passing a single-element array gives exactly `origin`+`destination` with no waypoints — no new URL builder needed).
- `🚗 Distance: {x} miles ({2x} mi round trip)` badge, once geocoded.
- `💰 Log Mileage Expense` → confirmation modal showing `{miles} × ${rate}/mi = ${amount}`, confirm posts to `log-mileage`. Buttons for an appointment already logged (checked against the fetched mileage-expense list by `appointmentId`) show a disabled "✅ Logged" state instead, so tapping twice can't double-log the same trip.
- The edit modal (existing) gains the three new fields: Appointment Time, Location/Address (defaults blank — this is the destination, always appointment-specific), Starting Address (defaults to `BVM_OFFICE_ADDRESS` for a *new* appointment only, left as-saved when editing).

## UI: new `/admin/bvm/expenses` — "Mileage Expenses"
Spec offers `/admin/expenses` or `/admin/bvm/expenses`; going with the BVM one — `/admin/expenses` doesn't exist as a real page (only per-client expense tabs under `/admin/clients/[id]` do, and those are the Organization-billable system this feature deliberately doesn't touch). Added as a new BVM subtab (`AdminNav.tsx`'s `BVM_LINKS`, next to BVM Reports) rather than bolting BVM's internal mileage log onto the client-billing Expenses UI.

Table: date, client name (from the joined appointment, falling back to the `description` field if the appointment was since deleted), miles, rate applied (`amount / miles`, display-only — not a stored column, since it's fully derivable from the two numbers already stored and storing a third redundant value risks drifting out of sync with them), amount. Header tiles: this-month total and this-year total mileage deduction (sum of `amount`).

## Out of scope
- No Distance Matrix/real-driving-distance API — haversine, consistent with every other distance calc already in this app (Drop-Off Route's optimizer and radar).
- No edit/delete UI for logged mileage expenses (the spec asks for a log/filter view, not a full CRUD expense editor).
