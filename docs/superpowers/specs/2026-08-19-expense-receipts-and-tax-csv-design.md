# Expense Receipts + Tax CSV Export — Design

## Schema
`Expense.receiptUrl` already exists (added when the model was first built, before this session touched it) — no migration needed for item 1's schema ask. Reused as-is with the same base64-data-URL convention already established for client/appointment photos this session (`readFileAsDataUrl` + `MAX_PHOTO_BYTES` from `src/lib/photoAttachment.ts` — reused directly, not reimplemented).

## Gap found before building: there was no way to log a direct (non-mileage) expense
`/api/bvm/expenses` GET was hardcoded to `type: 'MILEAGE'` and the only write path was the appointment page's "Log Mileage Expense" flow — there was no form anywhere that could create a `type: 'EXPENSE'` row in BVM's `organizationId: null` bucket. Item 3's "Total Direct Business Expenses" KPI would always read $0, and item 1's "expense logging... forms" has nothing to attach a receipt to besides mileage trips. Adding a "+ Add Expense" form to close that gap — it's implied by both requirements, not scope creep: a receipts feature with nothing to receipt, and a KPI that's permanently zero, aren't what was actually asked for.

`/api/bvm/expenses`:
- GET: drops the `type: 'MILEAGE'` filter — now returns every `organizationId: null` row (both types), which is what the page's unified list and KPIs need.
- POST (new): creates a direct expense — `{ date, category, description, amount, receiptUrl }` → `Expense{ organizationId: null, type: 'EXPENSE', ... }`.
- PATCH (new): `{ id, receiptUrl }` — lets a receipt be attached *after* the fact to an expense (mileage or direct) that was logged without one, since the spec's "Attach Receipt Photo" button lives on the expense cards, not just a creation form.

## Export
New `GET /api/bvm/expenses/export?range=ytd|month|custom&month=YYYY-MM&start=&end=`. Server builds the CSV text directly (not client-assembled from JSON) since the header summary rows need totals computed once, server-side, from the same query that produces the rows — computing them twice (once for display, once for export) risks the two disagreeing. Reuses the existing quote-and-escape CSV convention already in `addresses/page.tsx`'s `toCsv`.

Output shape:
```
BVM Business Expense Tax Summary
Range:,2026-01-01 to 2026-08-19
Total Miles Driven:,142.6
Total Mileage Deduction:,$95.54
Total Direct Expenses:,$212.00
Total Combined Deduction:,$307.54

Date,Category,Description / Client Name,Distance (Miles),IRS Rate,Amount ($),Receipt Attached (Yes/No),Appointment Linked
...
```
Blank `IRS Rate`/`Distance` cells for direct (non-mileage) rows — a rate/distance that doesn't apply to that row shouldn't show a misleading `0`. `Description / Client Name` prefers the linked appointment's client name (mileage rows), falling back to the expense's own `description` (direct rows). Delivered the same way `addresses/page.tsx` already downloads its CSV export (fetch → Blob → anchor click) for consistency, not a server `Content-Disposition` redirect.

## KPI cards
Computed client-side from the full (unfiltered-by-export-range) fetched list — the KPIs are fixed to "this month" / "YTD" per the spec, a separate concern from whatever range the export picker has selected:
- **Total Miles Driven** — this-month and YTD sums of `miles` on `type: 'MILEAGE'` rows, shown together in one card (spec groups them under one bullet).
- **IRS Mileage Deduction** — YTD sum of `amount` on `MILEAGE` rows (the tax-relevant period; using the already-stored `amount` rather than recomputing `miles × rate` keeps it consistent with whatever was actually logged, even if the rate changes in the future).
- **Total Direct Business Expenses** — YTD sum of `amount` on `EXPENSE` rows.
- **Total Estimated Tax Deduction** — sum of the previous two.

## Receipt UI
Card thumbnail (small `<img>`) when `receiptUrl` is set; tapping it opens a full-screen lightbox (`fixed inset-0`, image at natural/contained size, click-outside or X to close — same modal-overlay pattern already used everywhere else in this app, just full-bleed instead of a centered card). Cards without a receipt get a "📸 Attach Receipt Photo" button instead of the thumbnail.

## Out of scope
- No receipt OCR/auto-fill from the photo (not requested).
- No edit/delete for logged expenses beyond receipt attachment (matches the existing Mileage Expenses page, which was already log/view-only).
