# Client Analytics Tab — Design

Date: 2026-08-17

## Purpose

Add an "Analytics" tab to `/admin/clients/[id]` surfacing invoice turnover,
task velocity, and expense/mileage totals for a single client organization.

## Data source constraints

No `Invoice` model exists in `prisma/schema.prisma`. Billing state lives in
`Subscription` (one row per Stripe subscription: `amount`, `status`
ACTIVE/PAST_DUE/CANCELED, `currentPeriodEnd`, `createdAt`, `updatedAt`, no
paid-date, no per-invoice line items). Per user decision, `Subscription` is
used as the proxy for "invoice" metrics rather than adding a new model or
calling the live Stripe Invoices API. "Average days to payment resolution" is
therefore an approximation (`updatedAt - createdAt` on ACTIVE rows) and must
be labeled as approximate in the UI, not presented as exact.

`Task` has no `completedAt` field — completion is `status === 'DONE'`, and
`updatedAt` stands in for completion timestamp throughout.

`Expense` is a combined expense+mileage model (`type: 'EXPENSE' | 'MILEAGE'`).

## API

`src/app/api/clients/[id]/analytics/route.ts` — `GET`, matches the existing
`/api/clients/[id]/...` convention (there is no `/api/admin/clients` path
anywhere in the repo; introducing one would fork the convention). Auth:
same inline `requireOwner()` cookie-role check used by sibling routes
(`expenses/route.ts`, `meetings/route.ts`) — 401 if not OWNER.

Query param: `days` (`30` default, or `60`) — controls the task-velocity
window only.

All queries scoped by `organizationId = params.id` (== `client.id` from the
page, confirmed via `ContentStudio` usage in `page.tsx`).

Response shape:

```ts
{
  revenue: {
    totalInvoiced: number;       // sum(Subscription.amount), all rows
    outstanding: number;          // sum(amount) where status = PAST_DUE
    paidAmount: number;           // sum(amount) where status = ACTIVE
    canceledAmount: number;       // sum(amount) where status = CANCELED
    paidRatio: number | null;     // paidAmount / (paidAmount + outstanding), null if both 0
    avgResolutionDays: number | null; // avg(updatedAt-createdAt) days, ACTIVE rows only; null if none
    subscriptionCount: number;
  };
  tasks: {
    totalCreated: number;
    totalCompleted: number;       // status = DONE
    completionRate: number | null; // completed/created, null if created = 0
    avgTurnaroundDays: number | null; // avg(updatedAt-createdAt) days, DONE rows only
    velocity: {
      windowDays: 30 | 60;
      weeks: { weekStart: string; completed: number }[]; // ISO date, oldest first
    };
  };
  expenses: {
    totalExpenses: number;   // sum(amount) type=EXPENSE
    totalMileageCost: number; // sum(amount) type=MILEAGE
    totalMiles: number;       // sum(miles) type=MILEAGE
  };
}
```

Weekly buckets: divide the `days` window into 7-day buckets ending today,
bucket a DONE task by `updatedAt`. Empty buckets report `completed: 0`.

## UI

`src/components/admin/clients/ClientAnalyticsTab.tsx`, client component,
same visual language as `ExpensesTab.tsx` (dark surfaces, `bg-white/5
border-white/10 rounded-2xl`, emerald accent, `font-mono` uppercase labels).

Wired into `src/app/(admin)/admin/clients/[id]/page.tsx`:
- `TabId` gains `'analytics'`, `TABS` gains `{ id: 'analytics', label: 'Analytics' }`
- render block: `{tab === 'analytics' && <ClientAnalyticsTab clientId={client.id} />}`

Layout:
1. **KPI row** (4 cards): Total Revenue, Outstanding Balance, Task Velocity
   (avg completed/week over selected window), Avg Turnaround Time (days,
   tasks). Skeleton: `animate-pulse` placeholder cards in the same grid
   while loading, not a spinner.
2. **Invoice status distribution**: single stacked horizontal progress bar
   (emerald = ACTIVE/paid, red = PAST_DUE/overdue, gray = CANCELED — schema
   has exactly these 3 statuses, no separate "pending" bucket) with a $
   legend row underneath. Subtext: "Avg. resolution ≈ N days (approx.)".
   Empty state ("No invoices yet") if `subscriptionCount === 0`.
3. **Task completion trend**: plain CSS div bar chart (no charting library —
   `recharts` is a dependency but unused anywhere in `src`, and a 30/60-day
   weekly bar count doesn't need it), bar height scaled to the window's max,
   emerald fill, 30/60 toggle button pair re-fetching with `?days=`. Empty
   state ("No tasks yet") if `totalCreated === 0`.
4. **Expense & mileage row**: two stat blocks, Total Expenses / Total
   Mileage (cost + miles). Empty state ("No expenses logged") if both are 0.

Fetch: `GET /api/clients/${clientId}/analytics?days=${window}`, refetch on
`clientId` or window-toggle change, `toast.error` on failure (matches
`ExpensesTab` pattern).

## Out of scope

- Real per-invoice history / Stripe Invoices API integration.
- New Prisma models or migrations.
- Editing/creating records from this tab (read-only dashboard).

## Testing

`tsc --noEmit` must pass after implementation. No new runtime test
infrastructure introduced (none exists for sibling tabs).
