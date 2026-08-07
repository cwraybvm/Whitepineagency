# Client Management Modules — Design

## Context

Request: 5 internal client-management modules — meeting notes, expense/mileage tracking, a
billable-time timer, an ADHD-optimized personal task checklist, and a campaign A/B testing
sandbox.

The originating request framed this around a `Client` model and `/portal/clients/[id]`. Neither
exists. This app has no `Client` entity — `Organization` is the agency's customer/tenant, and
`/portal` (route group `(client)`) is the *customer-facing* login (`CLIENT_OWNER`/`CLIENT_MEMBER`
roles per `src/proxy.ts`). Putting internal billing/notes tools there would expose them to the
agency's own clients.

Confirmed with the requester: `Client` = `Organization`. The 4 client-scoped modules live under
`(admin)/admin` (`OWNER`-gated per `src/proxy.ts`'s route matrix), matching where
`CmoExecutiveDashboard` and the org-credential routes already live. The campaign sandbox lands
under the existing `(sandbox)/sandbox` route group instead, following the sandbox's existing
staged/unassigned pattern (`CreativeAsset`: `organizationId` nullable, promoted to a client later).

No admin client detail page exists today — `admin/shadow/[clientId]` is an impersonation preview,
not a management view, so a client list + detail page is new scope, not an extension of an
existing page.

Status fields on the new models follow the codebase's existing convention: plain `String` with a
default and a comment listing valid values (`ContentPost.status`, `FulfillmentTask.status`,
`Lead.stage`), not Prisma enums. `UserRole` is the only real enum in the schema.

Markdown rendering reuses `marked` (already a dependency). Drag-and-drop reuses
`@hello-pangea/dnd` (already used elsewhere, e.g. the existing Trello-style board). CSV export is
a plain string-join, no new dependency. No test framework exists in this repo (no
jest/vitest/playwright configured); verification is manual dev-server passes per module, consistent
with how existing features here were built.

## Schema changes

Six new models in `prisma/schema.prisma`, plus 5 new back-relations on `Organization`
(`clientMeetings`, `expenses`, `timeEntries`, `tasks`, `campaigns`).

```prisma
model ClientMeeting {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  title         String
  meetingDate   DateTime
  attendees     String[] @default([])
  bodyMarkdown  String   @db.Text
  billableHours Float    @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([organizationId])
  @@index([meetingDate])
}

model Expense {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  type       String   @default("EXPENSE") // EXPENSE, MILEAGE
  amount     Float    @default(0)
  miles      Float?
  category   String   @default("General")
  receiptUrl String?
  date       DateTime @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([organizationId])
  @@index([date])
  @@index([type])
}

model TimeEntry {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  startTime       DateTime  @default(now())
  endTime         DateTime?
  durationSeconds Int       @default(0)
  isBilled        Boolean   @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([organizationId])
  @@index([isBilled])
}

model Task {
  id             String        @id @default(uuid())
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  title        String
  status       String    @default("INBOX") // INBOX, ACTIVE, DONE
  priority     Int       @default(0)
  dueDate      DateTime?
  isFocusToday Boolean   @default(false)
  focusOrder   Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([organizationId])
  @@index([status])
}

model Campaign {
  id             String        @id @default(uuid())
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name   String
  status String @default("DRAFT") // DRAFT, ACTIVE, COMPLETE

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  variants CampaignVariant[]

  @@index([organizationId])
  @@index([status])
}

model CampaignVariant {
  id         String   @id @default(uuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  headline    String
  spend       Float @default(0)
  impressions Int   @default(0)
  clicks      Int   @default(0)
  conversions Int   @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([campaignId])
}
```

CTR (`clicks / impressions`) and CPA (`spend / conversions`) are computed client-side from the raw
counts, not stored — avoids stale derived data.

`Task.organizationId` and `Campaign.organizationId` are nullable by design: a checklist task isn't
always client work, and a campaign starts unassigned in the sandbox (mirrors `CreativeAsset`).
`ClientMeeting`, `Expense`, and `TimeEntry` require an `organizationId` — all three only make sense
attached to a client.

Only one running `TimeEntry` (`endTime IS NULL`) is allowed at a time. Enforced in the `POST
/api/time-entries` handler (reject or auto-stop the existing one), not via a partial unique index —
simpler, and Postgres partial-unique support isn't otherwise used in this schema.

Migration: `npx prisma migrate dev --name add_client_management_modules`.

## Wave 2 — Client UI Tools & Timer

- `src/app/api/clients/route.ts` — GET list (`id`, `name`, `status`)
- `src/app/(admin)/admin/clients/page.tsx` — client list table
- `src/app/(admin)/admin/clients/[id]/page.tsx` — detail shell, tabs: Overview / Meeting Notes / Expenses
- `src/components/admin/clients/ClientMeetingsTab.tsx` — list + markdown editor modal (`marked` for preview)
- `src/app/api/clients/[id]/meetings/route.ts` (GET/POST)
- `src/app/api/clients/[id]/meetings/[meetingId]/route.ts` (PATCH/DELETE)
- `src/components/admin/clients/ExpensesTab.tsx` — quick-add modal, category summary table, CSV export
- `src/app/api/clients/[id]/expenses/route.ts` (GET/POST)
- `src/app/api/clients/[id]/expenses/[expenseId]/route.ts` (DELETE)
- `src/components/BillingTimerWidget.tsx` — floating widget: client dropdown, Start/Stop, running
  counter. Mounted in all three internal layouts — `(admin)/admin/layout.tsx`,
  `(fulfillment)/fulfillment/layout.tsx`, `(sandbox)/sandbox/layout.tsx` — since staff move between
  those areas and the timer should keep running across them.
- `src/app/api/time-entries/route.ts` (GET running/recent, POST start)
- `src/app/api/time-entries/[id]/route.ts` (PATCH to stop — computes and stores `durationSeconds`)

## Wave 3 — Tasks & Sandbox

`/api/tasks` is already taken by the existing `TaskCard`/`TaskColumn` Kanban system — the new
checklist uses a distinct path (`/api/focus-tasks`) to avoid collision.

- `src/app/api/focus-tasks/route.ts` (GET/POST)
- `src/app/api/focus-tasks/[id]/route.ts` (PATCH/DELETE)
- `src/app/(admin)/admin/tasks/page.tsx` — Kanban (`@hello-pangea/dnd`), Top 3 Daily Focus toggle
  (`isFocusToday`/`focusOrder`), keyboard-driven quick add
- `src/app/api/sandbox/campaigns/route.ts` (GET/POST)
- `src/app/api/sandbox/campaigns/[id]/variants/route.ts` (POST)
- `src/app/api/sandbox/campaigns/[id]/variants/[variantId]/route.ts` (PATCH/DELETE)
- `src/app/(sandbox)/sandbox/campaigns/page.tsx` — side-by-side variant comparison table, CTR/CPA
  computed inline
- `src/components/sandbox/CampaignComparisonTable.tsx`

## Testing

No automated test framework in this repo. Verification is a manual dev-server pass per module's
golden path (create/edit/delete flows, timer start/stop, drag-and-drop status changes, CSV export
output), matching how existing features in this codebase were verified.
