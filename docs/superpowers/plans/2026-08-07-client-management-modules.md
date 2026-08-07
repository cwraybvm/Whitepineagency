# Client Management Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 internal client-management modules — meeting notes, expense/mileage tracking, a billable-time timer, a personal task checklist, and a campaign A/B sandbox — to the `(admin)`/`(fulfillment)`/`(sandbox)` staff areas of white-pine-portal.

**Architecture:** Six new Prisma models (`ClientMeeting`, `Expense`, `TimeEntry`, `Task`, `Campaign`, `CampaignVariant`) attached to the existing `Organization` model (the "client" entity). Each feature is a Next.js API route (`src/app/api/**/route.ts`) plus a client component, following the existing fetch-from-`'use client'`-component pattern used throughout this codebase (no server actions anywhere in this repo — don't introduce them here).

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL (`@prisma/adapter-pg`), Tailwind, `framer-motion` for modals, `lucide-react` icons, `sonner` for toasts, `@hello-pangea/dnd` for drag-and-drop, `marked` for markdown rendering.

## Global Constraints

- No new npm dependencies — `marked`, `@hello-pangea/dnd`, `framer-motion`, `lucide-react`, `sonner` are already installed and cover every UI need in this plan.
- No server actions — every mutation goes through a `src/app/api/**/route.ts` handler called via `fetch`, matching every existing feature in this repo.
- Status-like fields are plain `String` with a default and a comment listing valid values, not Prisma enums — matches `ContentPost.status`, `FulfillmentTask.status`, `Lead.stage`.
- No automated test framework exists in this repo (no jest/vitest/playwright). Each task's "verify" step is a manual dev-server + `curl` check, not an automated test.
- New routes under `(admin)/admin`, `(fulfillment)/fulfillment`, `(sandbox)/sandbox` are already RBAC-gated (`OWNER`/`OPERATOR`) by `src/proxy.ts`'s existing path-prefix matcher — no new auth code needed in the route handlers themselves.
- Prisma client singleton is `import { prisma } from '@/lib/prisma'` — always use this, never `new PrismaClient()`.

---

### Task 1: Schema — six new models + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `prisma.clientMeeting`, `prisma.expense`, `prisma.timeEntry`, `prisma.task`, `prisma.campaign`, `prisma.campaignVariant` — every later task depends on these Prisma Client models existing.

- [ ] **Step 1: Add the six models to `prisma/schema.prisma`**

Insert after the `Metric` model (end of file):

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

- [ ] **Step 2: Add the 5 back-relations to `Organization`**

In `prisma/schema.prisma`, inside the `Organization` model's `// Relations` block (currently ending at `creativeAssets CreativeAsset[]` around line 71), add:

```prisma
  clientMeetings     ClientMeeting[]
  expenses           Expense[]
  timeEntries        TimeEntry[]
  tasks              Task[]
  campaigns          Campaign[]
```

- [ ] **Step 3: Run the migration**

Run: `npx prisma migrate dev --name add_client_management_modules`
Expected: migration succeeds, a new folder appears under `prisma/migrations/`, and the command prints "Your database is now in sync with your schema."

- [ ] **Step 4: Verify the Prisma Client picked up the new models**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

Run (PowerShell): `node -e "const {PrismaClient} = require('@prisma/client'); const c = new PrismaClient(); console.log(typeof c.clientMeeting, typeof c.expense, typeof c.timeEntry, typeof c.task, typeof c.campaign, typeof c.campaignVariant)"`
Expected: `object object object object object object` (six times) — confirms all six models exist on the generated client.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add ClientMeeting, Expense, TimeEntry, Task, Campaign models"
```

---

### Task 2: Client list + detail shell

**Files:**
- Create: `src/app/api/clients/route.ts`
- Create: `src/app/(admin)/admin/clients/page.tsx`
- Create: `src/app/(admin)/admin/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `prisma.organization` (existing model).
- Produces: `GET /api/clients` → `{ id: string; name: string; status: string }[]`. `/admin/clients/[id]` page renders tab state (`'overview' | 'meetings' | 'expenses'`) that Tasks 3–4 plug their tab components into.

- [ ] **Step 1: Create the client list API route**

`src/app/api/clients/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clients = await prisma.organization.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clients);
}
```

- [ ] **Step 2: Verify the route manually**

Run: `npm run dev` (leave running), then in another terminal: `curl http://localhost:3000/api/clients`
Expected: a JSON array of `{id, name, status}` objects (or `[]` if no orgs seeded yet — either is fine, it proves the route and Prisma query work).

- [ ] **Step 3: Create the client list page**

`src/app/(admin)/admin/clients/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  status: string;
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold text-white">Clients</h1>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <Link href={`/admin/clients/${c.id}`} className="text-emerald-400 hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-400">{c.status}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-gray-500">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the client detail shell page**

`src/app/(admin)/admin/clients/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ClientMeetingsTab from '@/components/admin/clients/ClientMeetingsTab';
import ExpensesTab from '@/components/admin/clients/ExpensesTab';

interface ClientDetail {
  id: string;
  name: string;
  status: string;
}

type TabId = 'overview' | 'meetings' | 'expenses';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'meetings', label: 'Meeting Notes' },
  { id: 'expenses', label: 'Expenses' },
];

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((all: ClientDetail[]) => {
        setClient(all.find((c) => c.id === clientId) || null);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-gray-400">
        Client not found. <Link href="/admin/clients" className="text-emerald-400 hover:underline">Back to clients</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">{client.name}</h1>
        <span className="text-xs font-mono text-gray-500 uppercase">{client.status}</span>
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === t.id ? 'border-emerald-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="text-gray-400 text-sm">Client ID: {client.id}</div>
      )}
      {tab === 'meetings' && <ClientMeetingsTab clientId={client.id} />}
      {tab === 'expenses' && <ExpensesTab clientId={client.id} />}
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

With `npm run dev` running, log in as `OWNER` (or use `ADMIN_PASSWORD` bypass per `src/app/api/auth/login/route.ts`) and visit `/admin/clients`. Expected: table renders (empty or with seeded orgs). Click a client name (or navigate to `/admin/clients/<any-org-id>` directly) — expected: detail shell renders with 3 tabs; Overview shows the client ID; Meeting Notes / Expenses tabs render (they'll error until Tasks 3–4 land — that's expected at this point, not a regression to fix now).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/clients src/app/\(admin\)/admin/clients
git commit -m "feat: add client list and detail shell pages"
```

---

### Task 3: Meeting Notes tab

**Files:**
- Create: `src/app/api/clients/[id]/meetings/route.ts`
- Create: `src/app/api/clients/[id]/meetings/[meetingId]/route.ts`
- Create: `src/components/admin/clients/ClientMeetingsTab.tsx`

**Interfaces:**
- Consumes: `prisma.clientMeeting` (Task 1). Rendered inside `ClientDetailPage`'s `'meetings'` tab (Task 2), receiving `clientId: string` prop.
- Produces: `GET/POST /api/clients/[id]/meetings`, `PATCH/DELETE /api/clients/[id]/meetings/[meetingId]`.

- [ ] **Step 1: Create the meetings collection route**

`src/app/api/clients/[id]/meetings/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meetings = await prisma.clientMeeting.findMany({
    where: { organizationId: id },
    orderBy: { meetingDate: 'desc' },
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, meetingDate, attendees, bodyMarkdown, billableHours } = await req.json();

  if (!title || !meetingDate) {
    return NextResponse.json({ error: 'Title and meeting date are required' }, { status: 400 });
  }

  const meeting = await prisma.clientMeeting.create({
    data: {
      organizationId: id,
      title,
      meetingDate: new Date(meetingDate),
      attendees: Array.isArray(attendees) ? attendees : [],
      bodyMarkdown: bodyMarkdown || '',
      billableHours: billableHours ?? 0,
    },
  });
  return NextResponse.json(meeting, { status: 201 });
}
```

- [ ] **Step 2: Create the single-meeting route**

`src/app/api/clients/[id]/meetings/[meetingId]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const body = await req.json();
  const { title, meetingDate, attendees, bodyMarkdown, billableHours } = body;

  const meeting = await prisma.clientMeeting.update({
    where: { id: meetingId },
    data: {
      ...(title !== undefined && { title }),
      ...(meetingDate !== undefined && { meetingDate: new Date(meetingDate) }),
      ...(attendees !== undefined && { attendees }),
      ...(bodyMarkdown !== undefined && { bodyMarkdown }),
      ...(billableHours !== undefined && { billableHours }),
    },
  });
  return NextResponse.json(meeting);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  await prisma.clientMeeting.delete({ where: { id: meetingId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify the API manually**

With dev server running:
```bash
curl -X POST http://localhost:3000/api/clients/<real-org-id>/meetings \
  -H "Content-Type: application/json" \
  -d '{"title":"Kickoff call","meetingDate":"2026-08-07","attendees":["Colin","Client PM"],"bodyMarkdown":"# Notes\n- discussed scope","billableHours":1.5}'
```
Expected: 201 with the created meeting JSON, including a generated `id`.

```bash
curl http://localhost:3000/api/clients/<real-org-id>/meetings
```
Expected: array containing that meeting.

- [ ] **Step 4: Create the tab component**

`src/components/admin/clients/ClientMeetingsTab.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  attendees: string[];
  bodyMarkdown: string;
  billableHours: number;
}

export default function ClientMeetingsTab({ clientId }: { clientId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendeesInput, setAttendeesInput] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [billableHours, setBillableHours] = useState(0);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/meetings`)
      .then((res) => res.json())
      .then(setMeetings)
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          meetingDate,
          attendees: attendeesInput.split(',').map((a) => a.trim()).filter(Boolean),
          bodyMarkdown,
          billableHours,
        }),
      });
      if (!res.ok) throw new Error('Failed to save meeting');
      toast.success('Meeting note saved');
      setModalOpen(false);
      setTitle('');
      setBodyMarkdown('');
      setAttendeesInput('');
      setBillableHours(0);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
      >
        <Plus className="w-4 h-4" /> New Meeting Note
      </button>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div key={m.id} className="border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{m.title}</span>
                <span className="text-xs text-gray-500">{new Date(m.meetingDate).toLocaleDateString()}</span>
              </div>
              {m.attendees.length > 0 && (
                <div className="text-xs text-gray-400">Attendees: {m.attendees.join(', ')}</div>
              )}
              <div
                className="prose prose-invert prose-sm max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: marked.parse(m.bodyMarkdown || '') as string }}
              />
              {m.billableHours > 0 && (
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <Clock className="w-3 h-3" /> {m.billableHours}h billable
                </div>
              )}
            </div>
          ))}
          {meetings.length === 0 && <div className="text-gray-500 text-sm">No meeting notes yet.</div>}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-lg w-full space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">New Meeting Note</span>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                placeholder="Attendees (comma-separated)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <textarea
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                placeholder="Notes (markdown supported)"
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              <input
                type="number"
                step="0.25"
                min="0"
                value={billableHours}
                onChange={(e) => setBillableHours(Number(e.target.value))}
                placeholder="Billable hours"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Visit `/admin/clients/<real-org-id>`, click Meeting Notes tab. Expected: the meeting created via curl in Step 3 renders with rendered markdown. Click "New Meeting Note", fill the form, save. Expected: toast "Meeting note saved", modal closes, new note appears in the list.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/clients/\[id\]/meetings src/components/admin/clients/ClientMeetingsTab.tsx
git commit -m "feat: add client meeting notes tab"
```

---

### Task 4: Expense & Mileage tab

**Files:**
- Create: `src/app/api/clients/[id]/expenses/route.ts`
- Create: `src/app/api/clients/[id]/expenses/[expenseId]/route.ts`
- Create: `src/components/admin/clients/ExpensesTab.tsx`

**Interfaces:**
- Consumes: `prisma.expense` (Task 1). Rendered inside `ClientDetailPage`'s `'expenses'` tab (Task 2), receiving `clientId: string` prop.
- Produces: `GET/POST /api/clients/[id]/expenses`, `DELETE /api/clients/[id]/expenses/[expenseId]`.

- [ ] **Step 1: Create the expenses collection route**

`src/app/api/clients/[id]/expenses/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expenses = await prisma.expense.findMany({
    where: { organizationId: id },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { type, amount, miles, category, receiptUrl, date } = await req.json();

  if (!type || (type !== 'EXPENSE' && type !== 'MILEAGE')) {
    return NextResponse.json({ error: 'Type must be EXPENSE or MILEAGE' }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      organizationId: id,
      type,
      amount: amount ?? 0,
      miles: type === 'MILEAGE' ? miles ?? 0 : null,
      category: category || 'General',
      receiptUrl: receiptUrl || null,
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
```

- [ ] **Step 2: Create the single-expense route**

`src/app/api/clients/[id]/expenses/[expenseId]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify the API manually**

```bash
curl -X POST http://localhost:3000/api/clients/<real-org-id>/expenses \
  -H "Content-Type: application/json" \
  -d '{"type":"MILEAGE","miles":42,"amount":29.4,"category":"Travel","date":"2026-08-07"}'
```
Expected: 201 with created expense.

```bash
curl http://localhost:3000/api/clients/<real-org-id>/expenses
```
Expected: array containing that expense.

- [ ] **Step 4: Create the tab component**

`src/components/admin/clients/ExpensesTab.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Expense {
  id: string;
  type: string;
  amount: number;
  miles: number | null;
  category: string;
  receiptUrl: string | null;
  date: string;
}

function toCsv(rows: Expense[]): string {
  const header = 'Date,Type,Category,Amount,Miles,Receipt URL';
  const lines = rows.map((r) =>
    [
      new Date(r.date).toLocaleDateString(),
      r.type,
      r.category,
      r.amount.toFixed(2),
      r.miles ?? '',
      r.receiptUrl ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export default function ExpensesTab({ clientId }: { clientId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<'EXPENSE' | 'MILEAGE'>('EXPENSE');
  const [amount, setAmount] = useState(0);
  const [miles, setMiles] = useState(0);
  const [category, setCategory] = useState('General');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/expenses`)
      .then((res) => res.json())
      .then(setExpenses)
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    }
    return Array.from(totals.entries());
  }, [expenses]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount, miles: type === 'MILEAGE' ? miles : undefined, category, receiptUrl, date }),
      });
      if (!res.ok) throw new Error('Failed to save expense');
      toast.success('Expense added');
      setModalOpen(false);
      setAmount(0);
      setMiles(0);
      setReceiptUrl('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/clients/${clientId}/expenses/${id}`, { method: 'DELETE' });
    load();
  }

  function handleExport() {
    const csv = toCsv(expenses);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${clientId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Quick Add
        </button>
        <button
          onClick={handleExport}
          disabled={expenses.length === 0}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([cat, total]) => (
            <div key={cat} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-gray-400">{cat}: </span>
              <span className="text-white font-medium">${total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Miles</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-gray-300">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-300">{e.type}</td>
                  <td className="p-3 text-gray-300">{e.category}</td>
                  <td className="p-3 text-right text-white">${e.amount.toFixed(2)}</td>
                  <td className="p-3 text-right text-gray-400">{e.miles ?? '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(e.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-md w-full space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">Quick Add</span>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('EXPENSE')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'EXPENSE' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'}`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setType('MILEAGE')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'MILEAGE' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'}`}
                >
                  Mileage
                </button>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              {type === 'MILEAGE' && (
                <input
                  type="number"
                  step="0.1"
                  value={miles}
                  onChange={(e) => setMiles(Number(e.target.value))}
                  placeholder="Miles"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              )}
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Amount ($)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="Receipt URL (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Visit `/admin/clients/<real-org-id>`, click Expenses tab. Expected: the mileage entry from Step 3's curl renders in the table and in the category summary chip. Add a new "Expense" type entry via Quick Add. Expected: toast success, new row appears, category chip total updates. Click "Export CSV". Expected: a `.csv` file downloads containing both rows with correct headers.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/clients/\[id\]/expenses src/components/admin/clients/ExpensesTab.tsx
git commit -m "feat: add client expense and mileage tab with CSV export"
```

---

### Task 5: Billing Timer widget

**Files:**
- Create: `src/app/api/time-entries/route.ts`
- Create: `src/app/api/time-entries/[id]/route.ts`
- Create: `src/components/BillingTimerWidget.tsx`
- Modify: `src/app/(admin)/admin/layout.tsx`
- Modify: `src/app/(fulfillment)/fulfillment/layout.tsx`
- Modify: `src/app/(sandbox)/sandbox/layout.tsx`

**Interfaces:**
- Consumes: `prisma.timeEntry` (Task 1), `GET /api/clients` (Task 2, for the client dropdown).
- Produces: `GET /api/time-entries` → `{ id, organizationId, startTime, endTime, durationSeconds, isBilled } | null` (the single active entry, or `null`). `POST /api/time-entries` body `{ organizationId }` → starts one. `PATCH /api/time-entries/[id]` body `{ action: 'stop' }` → stops one.

- [ ] **Step 1: Create the time-entries collection route**

`src/app/api/time-entries/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Returns the single currently-running entry (endTime IS NULL), or null.
export async function GET() {
  const active = await prisma.timeEntry.findFirst({
    where: { endTime: null },
    orderBy: { startTime: 'desc' },
  });
  return NextResponse.json(active);
}

export async function POST(req: Request) {
  const { organizationId } = await req.json();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const existing = await prisma.timeEntry.findFirst({ where: { endTime: null } });
  if (existing) {
    return NextResponse.json({ error: 'A timer is already running. Stop it before starting another.' }, { status: 409 });
  }

  const entry = await prisma.timeEntry.create({
    data: { organizationId, startTime: new Date() },
  });
  return NextResponse.json(entry, { status: 201 });
}
```

- [ ] **Step 2: Create the single-entry route**

`src/app/api/time-entries/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();

  if (action !== 'stop') {
    return NextResponse.json({ error: 'Only the "stop" action is supported' }, { status: 400 });
  }

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
  }
  if (entry.endTime) {
    return NextResponse.json({ error: 'Time entry already stopped' }, { status: 409 });
  }

  const endTime = new Date();
  const durationSeconds = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { endTime, durationSeconds },
  });
  return NextResponse.json(updated);
}
```

- [ ] **Step 3: Verify the API manually**

```bash
curl -X POST http://localhost:3000/api/time-entries -H "Content-Type: application/json" -d '{"organizationId":"<real-org-id>"}'
```
Expected: 201 with `endTime: null`.

```bash
curl -X POST http://localhost:3000/api/time-entries -H "Content-Type: application/json" -d '{"organizationId":"<real-org-id>"}'
```
Expected: 409 "A timer is already running" (proves the single-active-timer guard works).

```bash
curl -X PATCH http://localhost:3000/api/time-entries/<id-from-first-call> -H "Content-Type: application/json" -d '{"action":"stop"}'
```
Expected: 200 with `endTime` set and `durationSeconds > 0`.

- [ ] **Step 4: Create the widget component**

`src/components/BillingTimerWidget.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ActiveEntry {
  id: string;
  organizationId: string;
  startTime: string;
  endTime: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function BillingTimerWidget() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/clients').then((res) => res.json()).then((list: ClientOption[]) => {
      setClients(list);
      if (list.length > 0) setSelectedClientId((prev) => prev || list[0].id);
    });
    fetch('/api/time-entries').then((res) => res.json()).then((entry: ActiveEntry | null) => {
      setActive(entry);
      if (entry) setSelectedClientId(entry.organizationId);
    });
  }, []);

  useEffect(() => {
    if (!active) {
      if (tickRef.current) clearInterval(tickRef.current);
      setElapsed(0);
      return;
    }
    const start = new Date(active.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [active]);

  async function handleStart() {
    if (!selectedClientId) {
      toast.error('Select a client first');
      return;
    }
    const res = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: selectedClientId }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error || 'Failed to start timer');
      return;
    }
    setActive(await res.json());
  }

  async function handleStop() {
    if (!active) return;
    const res = await fetch(`/api/time-entries/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (!res.ok) {
      toast.error('Failed to stop timer');
      return;
    }
    toast.success('Time entry saved as pending billable time');
    setActive(null);
  }

  return (
    <div className="fixed top-4 right-4 z-[150] bg-[#080E1A] border border-white/20 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 font-mono text-xs">
      <Clock className="w-4 h-4 text-emerald-400" />
      <select
        value={selectedClientId}
        onChange={(e) => setSelectedClientId(e.target.value)}
        disabled={!!active}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs disabled:opacity-50"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="text-white tabular-nums w-16 text-center">{formatElapsed(elapsed)}</span>
      {active ? (
        <button onClick={handleStop} className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-lg">
          <Square className="w-3 h-3" /> Stop
        </button>
      ) : (
        <button onClick={handleStart} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg">
          <Play className="w-3 h-3" /> Start
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Mount the widget in all three internal layouts**

In `src/app/(admin)/admin/layout.tsx`, add the import and render it as a sibling of `<AdminCommandPalette />`:

```tsx
import BillingTimerWidget from "@/components/BillingTimerWidget";
```
```tsx
      <AdminCommandPalette />
      <BillingTimerWidget />
```

Repeat the same two edits (import + render next to `<AdminCommandPalette />`) in `src/app/(fulfillment)/fulfillment/layout.tsx` and `src/app/(sandbox)/sandbox/layout.tsx`.

- [ ] **Step 6: Verify in browser**

Visit `/admin`. Expected: floating widget top-right with a client dropdown and "Start" button. Click Start. Expected: dropdown disables, counter starts ticking up, button becomes "Stop". Navigate to `/fulfillment`. Expected: widget still shows the same running timer (state comes from `GET /api/time-entries`, not local-only state) and keeps ticking. Click Stop. Expected: toast "Time entry saved as pending billable time", counter resets, dropdown re-enables.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/time-entries src/components/BillingTimerWidget.tsx "src/app/(admin)/admin/layout.tsx" "src/app/(fulfillment)/fulfillment/layout.tsx" "src/app/(sandbox)/sandbox/layout.tsx"
git commit -m "feat: add global billing timer widget"
```

---

### Task 6: ADHD-optimized task checklist

**Files:**
- Create: `src/app/api/focus-tasks/route.ts`
- Create: `src/app/api/focus-tasks/[id]/route.ts`
- Create: `src/app/(admin)/admin/tasks/page.tsx`
- Modify: `src/components/AdminNav.tsx`

**Interfaces:**
- Consumes: `prisma.task` (Task 1).
- Produces: `GET/POST /api/focus-tasks`, `PATCH/DELETE /api/focus-tasks/[id]`.

- [ ] **Step 1: Create the focus-tasks collection route**

`src/app/api/focus-tasks/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const { title, organizationId, dueDate, priority } = await req.json();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title,
      organizationId: organizationId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? 0,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
```

- [ ] **Step 2: Create the single-task route**

`src/app/api/focus-tasks/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { title, status, priority, dueDate, isFocusToday, focusOrder } = body;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(isFocusToday !== undefined && { isFocusToday }),
      ...(focusOrder !== undefined && { focusOrder }),
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify the API manually**

```bash
curl -X POST http://localhost:3000/api/focus-tasks -H "Content-Type: application/json" -d '{"title":"Draft Q3 report"}'
curl -X POST http://localhost:3000/api/focus-tasks -H "Content-Type: application/json" -d '{"title":"Call ACME re: renewal"}'
curl http://localhost:3000/api/focus-tasks
```
Expected: two tasks with `status: "INBOX"`.

```bash
curl -X PATCH http://localhost:3000/api/focus-tasks/<id> -H "Content-Type: application/json" -d '{"status":"ACTIVE","isFocusToday":true,"focusOrder":1}'
```
Expected: 200 with updated fields.

- [ ] **Step 4: Create the Kanban + Focus Mode page**

`src/app/(admin)/admin/tasks/page.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Star, ListTodo } from 'lucide-react';

interface FocusTask {
  id: string;
  title: string;
  status: 'INBOX' | 'ACTIVE' | 'DONE';
  priority: number;
  dueDate: string | null;
  isFocusToday: boolean;
  focusOrder: number | null;
}

const COLUMNS: { id: FocusTask['status']; label: string }[] = [
  { id: 'INBOX', label: 'Inbox' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DONE', label: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/focus-tasks').then((res) => res.json()).then(setTasks);
  }

  useEffect(load, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        quickAddRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    await fetch('/api/focus-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickAddValue.trim() }),
    });
    setQuickAddValue('');
    load();
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as FocusTask['status'];
    const taskId = result.draggableId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await fetch(`/api/focus-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function toggleFocus(task: FocusTask) {
    const focusCount = tasks.filter((t) => t.isFocusToday).length;
    if (!task.isFocusToday && focusCount >= 3) return;
    const isFocusToday = !task.isFocusToday;
    await fetch(`/api/focus-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFocusToday, focusOrder: isFocusToday ? focusCount + 1 : null }),
    });
    load();
  }

  const focusTasks = tasks.filter((t) => t.isFocusToday).sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">Tasks</h1>
        </div>
        <button
          onClick={() => setFocusMode((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
            focusMode ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400'
          }`}
        >
          <Star className="w-3.5 h-3.5" /> Top 3 Focus
        </button>
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          ref={quickAddRef}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder="Quick add a task, press N to focus this box"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {focusMode ? (
        <div className="space-y-2">
          {focusTasks.length === 0 && (
            <div className="text-gray-500 text-sm">No focus tasks picked yet. Star up to 3 below.</div>
          )}
          {focusTasks.map((t) => (
            <div key={t.id} className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 text-white">
              {t.title}
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="bg-white/5 rounded-2xl p-3 space-y-2 min-h-[200px]">
                    <div className="text-xs font-mono uppercase text-gray-400">{col.label}</div>
                    {tasks
                      .filter((t) => t.status === col.id)
                      .map((t, index) => (
                        <Draggable draggableId={t.id} index={index} key={t.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="bg-[#0F172A] border border-white/10 rounded-xl p-3 text-sm text-white flex items-center justify-between gap-2"
                            >
                              <span>{t.title}</span>
                              <button onClick={() => toggleFocus(t)} className={t.isFocusToday ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}>
                                <Star className="w-3.5 h-3.5" fill={t.isFocusToday ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add a nav link**

In `src/components/AdminNav.tsx`, add to the `NAV_LINKS` array (after `"/admin"`):

```tsx
    { href: "/admin/tasks", label: "Tasks", mobileLabel: "Tasks", icon: "✅" },
```

- [ ] **Step 6: Verify in browser**

Visit `/admin/tasks`. Expected: the two tasks created via curl appear in the Inbox column. Press `n`. Expected: quick-add input focuses. Type a title, press Enter. Expected: new card appears in Inbox. Drag a card from Inbox to Active. Expected: card moves and stays there on page reload (state persisted via PATCH). Click the star on 3 different cards, toggle "Top 3 Focus". Expected: focus view shows exactly those 3. Try starring a 4th. Expected: no-op (capped at 3 per `focusCount >= 3` guard).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/focus-tasks "src/app/(admin)/admin/tasks" src/components/AdminNav.tsx
git commit -m "feat: add ADHD-optimized task checklist with Top 3 Daily Focus mode"
```

---

### Task 7: Campaign A/B testing sandbox

**Files:**
- Create: `src/app/api/sandbox/campaigns/route.ts`
- Create: `src/app/api/sandbox/campaigns/[id]/variants/route.ts`
- Create: `src/app/api/sandbox/campaigns/[id]/variants/[variantId]/route.ts`
- Create: `src/components/sandbox/CampaignComparisonTable.tsx`
- Create: `src/app/(sandbox)/sandbox/campaigns/page.tsx`

**Interfaces:**
- Consumes: `prisma.campaign`, `prisma.campaignVariant` (Task 1).
- Produces: `GET/POST /api/sandbox/campaigns` (campaign includes `variants: CampaignVariant[]`), `POST /api/sandbox/campaigns/[id]/variants`, `PATCH/DELETE /api/sandbox/campaigns/[id]/variants/[variantId]`.

- [ ] **Step 1: Create the campaigns collection route**

`src/app/api/sandbox/campaigns/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const { name, organizationId } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const campaign = await prisma.campaign.create({
    data: { name, organizationId: organizationId || null },
    include: { variants: true },
  });
  return NextResponse.json(campaign, { status: 201 });
}
```

- [ ] **Step 2: Create the variants collection route**

`src/app/api/sandbox/campaigns/[id]/variants/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { headline, spend, impressions, clicks, conversions } = await req.json();

  if (!headline) {
    return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
  }

  const variant = await prisma.campaignVariant.create({
    data: {
      campaignId: id,
      headline,
      spend: spend ?? 0,
      impressions: impressions ?? 0,
      clicks: clicks ?? 0,
      conversions: conversions ?? 0,
    },
  });
  return NextResponse.json(variant, { status: 201 });
}
```

- [ ] **Step 3: Create the single-variant route**

`src/app/api/sandbox/campaigns/[id]/variants/[variantId]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const body = await req.json();
  const { headline, spend, impressions, clicks, conversions } = body;

  const variant = await prisma.campaignVariant.update({
    where: { id: variantId },
    data: {
      ...(headline !== undefined && { headline }),
      ...(spend !== undefined && { spend }),
      ...(impressions !== undefined && { impressions }),
      ...(clicks !== undefined && { clicks }),
      ...(conversions !== undefined && { conversions }),
    },
  });
  return NextResponse.json(variant);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  await prisma.campaignVariant.delete({ where: { id: variantId } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Verify the API manually**

```bash
curl -X POST http://localhost:3000/api/sandbox/campaigns -H "Content-Type: application/json" -d '{"name":"Fall HVAC Promo"}'
```
Expected: 201, note the returned `id` as `<campaign-id>`.

```bash
curl -X POST http://localhost:3000/api/sandbox/campaigns/<campaign-id>/variants -H "Content-Type: application/json" -d '{"headline":"Save $500 on a new furnace","spend":200,"impressions":10000,"clicks":300,"conversions":12}'
curl -X POST http://localhost:3000/api/sandbox/campaigns/<campaign-id>/variants -H "Content-Type: application/json" -d '{"headline":"Winter-ready in 24 hours","spend":200,"impressions":9500,"clicks":250,"conversions":18}'
curl http://localhost:3000/api/sandbox/campaigns
```
Expected: one campaign with `variants` array containing both.

- [ ] **Step 5: Create the comparison table component**

`src/components/sandbox/CampaignComparisonTable.tsx`:

```tsx
'use client';

interface Variant {
  id: string;
  headline: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

function ctr(v: Variant): string {
  if (v.impressions === 0) return '—';
  return `${((v.clicks / v.impressions) * 100).toFixed(2)}%`;
}

function cpa(v: Variant): string {
  if (v.conversions === 0) return '—';
  return `$${(v.spend / v.conversions).toFixed(2)}`;
}

export default function CampaignComparisonTable({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) {
    return <div className="text-gray-500 text-sm">No variants yet.</div>;
  }

  return (
    <div className="overflow-x-auto border border-white/10 rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
          <tr>
            <th className="text-left p-3">Headline</th>
            <th className="text-right p-3">Spend</th>
            <th className="text-right p-3">Impressions</th>
            <th className="text-right p-3">Clicks</th>
            <th className="text-right p-3">CTR</th>
            <th className="text-right p-3">Conversions</th>
            <th className="text-right p-3">CPA</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className="border-t border-white/5">
              <td className="p-3 text-white">{v.headline}</td>
              <td className="p-3 text-right text-gray-300">${v.spend.toFixed(2)}</td>
              <td className="p-3 text-right text-gray-300">{v.impressions.toLocaleString()}</td>
              <td className="p-3 text-right text-gray-300">{v.clicks.toLocaleString()}</td>
              <td className="p-3 text-right text-emerald-400">{ctr(v)}</td>
              <td className="p-3 text-right text-gray-300">{v.conversions}</td>
              <td className="p-3 text-right text-emerald-400">{cpa(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Create the sandbox campaigns page**

`src/app/(sandbox)/sandbox/campaigns/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, FlaskConical } from 'lucide-react';
import CampaignComparisonTable from '@/components/sandbox/CampaignComparisonTable';

interface Variant {
  id: string;
  headline: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  variants: Variant[];
}

export default function CampaignSandboxPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [variantForm, setVariantForm] = useState<Record<string, { headline: string; spend: string; impressions: string; clicks: string; conversions: string }>>({});

  function load() {
    fetch('/api/sandbox/campaigns').then((res) => res.json()).then(setCampaigns);
  }

  useEffect(load, []);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    await fetch('/api/sandbox/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCampaignName.trim() }),
    });
    setNewCampaignName('');
    load();
  }

  function formFor(campaignId: string) {
    return variantForm[campaignId] || { headline: '', spend: '', impressions: '', clicks: '', conversions: '' };
  }

  async function handleAddVariant(campaignId: string) {
    const form = formFor(campaignId);
    if (!form.headline.trim()) return;
    await fetch(`/api/sandbox/campaigns/${campaignId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: form.headline,
        spend: Number(form.spend) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        conversions: Number(form.conversions) || 0,
      }),
    });
    setVariantForm((prev) => ({ ...prev, [campaignId]: { headline: '', spend: '', impressions: '', clicks: '', conversions: '' } }));
    load();
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-emerald-400" />
        <h1 className="text-lg font-bold text-white">Campaign A/B Sandbox</h1>
      </div>

      <form onSubmit={handleCreateCampaign} className="flex gap-2">
        <input
          value={newCampaignName}
          onChange={(e) => setNewCampaignName(e.target.value)}
          placeholder="New campaign name"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="space-y-6">
        {campaigns.map((c) => {
          const form = formFor(c.id);
          return (
            <div key={c.id} className="space-y-3">
              <div className="text-white font-medium">{c.name}</div>
              <CampaignComparisonTable variants={c.variants} />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <input
                  value={form.headline}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, headline: e.target.value } }))}
                  placeholder="Headline / hook"
                  className="col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.spend}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, spend: e.target.value } }))}
                  placeholder="Spend"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.impressions}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, impressions: e.target.value } }))}
                  placeholder="Impressions"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.clicks}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, clicks: e.target.value } }))}
                  placeholder="Clicks"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.conversions}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, conversions: e.target.value } }))}
                  placeholder="Conversions"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                onClick={() => handleAddVariant(c.id)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-medium"
              >
                Add Variant
              </button>
            </div>
          );
        })}
        {campaigns.length === 0 && <div className="text-gray-500 text-sm">No campaigns yet.</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify in browser**

Visit `/sandbox/campaigns`. Expected: the "Fall HVAC Promo" campaign from Step 4 renders with both variants in the comparison table, CTR and CPA computed correctly (e.g. variant 1: CTR 3.00%, CPA $16.67). Create a new campaign via the form. Expected: it appears below with an empty comparison table. Add a variant to it via the inline form. Expected: it appears in that campaign's table with computed CTR/CPA.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/sandbox/campaigns src/components/sandbox/CampaignComparisonTable.tsx "src/app/(sandbox)/sandbox/campaigns"
git commit -m "feat: add campaign A/B testing sandbox"
```

---

## Self-Review Notes

- **Spec coverage:** All 5 modules from the design doc map 1:1 to Tasks 3–7; Task 1 covers all schema; Task 2 covers the client list/detail shell the meeting/expense tabs plug into. Every file in the design doc's Wave 2/3 file plan appears in a task above.
- **Type consistency:** `Expense.miles` is `Float?` in schema and `number | null` in the `ExpensesTab` component — consistent. `Task.status` union `'INBOX' | 'ACTIVE' | 'DONE'` in `TasksPage` matches the schema comment. `TimeEntry` field names (`startTime`, `endTime`, `durationSeconds`) match between the API routes and `BillingTimerWidget`. `CampaignVariant` field names match between the API routes and `CampaignComparisonTable`.
- **No placeholders:** every step has runnable code and a concrete curl/browser verification, no "add error handling" stubs.
