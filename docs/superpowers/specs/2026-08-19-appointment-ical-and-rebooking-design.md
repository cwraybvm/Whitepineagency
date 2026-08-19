# Appointment iCal Export + Follow-Up Re-Booking — Design

## 1. `.ics` + Google Calendar link
`src/lib/calendarEvent.ts` (new, framework-agnostic — pure functions, no DOM):
- `parseTimeToHM(timeStr)`: `appointmentTime` is a free-text field (`"10:30 AM"`, added in the previous task) with no format guarantee. Regex-parses `H:MM AM/PM` or `HH:MM` (24h); anything unparseable or missing falls back to 9:00 AM — a default is needed since the .ics format requires *some* time, and 9 AM is a reasonable business-hours default that's obviously a placeholder if wrong (better than crashing or picking midnight).
- `computeEventRange(input)`: start = date + parsed time; end = start + `durationMinutes` (default 30, per spec).
- `buildIcsFile(id, input)`: RFC 5545 `VCALENDAR`/`VEVENT` text. Uses **floating local time** (`DTSTART:20260819T103000`, no `Z`, no `TZID`) rather than converting to UTC — this is a single-office US operation with no stored timezone anywhere in the schema; a floating time lets every calendar app interpret it in the device's own local zone, which is what "10:30 AM" means to the person who typed it. Converting to UTC would require a timezone we don't have and risks an off-by-hours bug for no benefit.
- `buildGoogleCalendarUrl(input)`: same floating-time format in the `dates=` param, for consistency with the `.ics` file (both should show the same wall-clock time).

Download flow reuses the existing Blob-URL-anchor-click pattern already in this codebase (`addresses/page.tsx`'s CSV export) — no new dependency. A small inline toggle-menu (matching the existing `addingAddress`/radar-panel toggle pattern already used twice on this page) replaces a full dropdown component for "two buttons that appear together" — same interaction, less code.

## 2. Complete Appointment + re-booking
`BvmAppointment` gets one new field: `completed Boolean @default(false)`. The spec asks to "save completion status" but no such flag exists today (`outcome` is a description, not a status) — this is the minimal addition that makes "completion status" a real, queryable thing rather than inferring it from freeform text. The completion notes themselves reuse the existing `notes` field via the same append-with-timestamp convention already established for drop-offs and voice memos this session (`[Completed: {timestamp}] {summary}`) — no new text column needed for that part.

Flow, using the two existing appointment endpoints (no new API route):
1. "✅ Complete Appointment" on a card opens a modal: completion-notes textarea, and a "Schedule Next Follow-Up / Drop-Off Visit?" checkbox.
2. Confirm → `PATCH /api/bvm/appointments` sets `completed: true` and the appended `notes`.
3. If the checkbox is checked (with a date filled in an inline date/time picker that appears when it's checked) → `POST /api/bvm/appointments` creates the follow-up, pre-filled with the same `clientName`, `clientEmail`, `address`, and `startAddress` as the completed appointment (same location — that's *why* it's a natural rebooking default) and the new date/time from the picker.
4. Both requests resolve, list refreshes, modal closes.

Completed appointments get the same "strikethrough + dimmed, action buttons replaced by a static badge" treatment the Drop-Off Route checklist already uses for `done` stops (`page.tsx`'s existing pattern) — visual consistency, not a new design language — and a small checkmark on their month-grid day chip.

## Out of scope
- No timezone field/config added to the schema — floating local time is correct for a single-office operation and adding TZID support for a feature nobody asked for would be premature.
- No link from the new follow-up appointment back to the one it was rebooked from (no field requested for it).
