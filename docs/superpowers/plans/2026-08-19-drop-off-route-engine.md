# Drop-Off Route Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/admin/bvm/drop-off-route` subtab that lists clients with linked addresses, lets ops pick a subset, nearest-neighbor-optimizes the visiting order, and launches Google Maps / Apple Maps / a copyable text summary from that order.

**Architecture:** Prisma gets an optional one-to-one link from `BvmClientKanban` to `BvmAddress` plus a geocode cache (`lat`/`lng`) on `BvmAddress`. A new GET route hydrates+geocodes-on-demand; a new POST route geocodes the free-text start location per request. Ordering is pure client-side haversine nearest-neighbor — no server round-trip once coordinates exist. Client Kanban's existing card modal is the only place addresses get linked (new dropdown + contact-name field, reusing its existing PATCH endpoint).

**Tech Stack:** Next.js (App Router) route handlers, Prisma (Postgres, `prisma db push` — this repo has no migration-file workflow, see `package.json`'s `build` script), Google Geocoding API via server-side `fetch` (key already present as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), Tailwind, lucide-react, sonner toasts. No test runner exists in this repo (no jest/vitest configured) — verification is `tsc --noEmit` + `npm run build` + manual browser smoke test, matching this project's actual conventions.

## Global Constraints
- No new npm dependencies (ponytail: use `fetch` for geocoding, no `@googlemaps/*` package; haversine nearest-neighbor, no TSP solver library).
- No renames of existing fields (`clientName` stays; it doubles as "business name" for display).
- Touch targets ≥44px (`min-h-[44px]`) on checkboxes/buttons per spec.
- Match existing BVM page conventions: `px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8` wrapper, `bg-slate-900 border border-slate-800 rounded-2xl` panels, `sonner` toasts, emoji-labeled action buttons where the spec names an emoji (⚡, 📋) rather than a lucide icon.

---

### Task 1: Schema — link clients to addresses + geocode cache

**Files:**
- Modify: `prisma/schema.prisma:811-841` (`BvmClientKanban`, `BvmAddress` models)

**Interfaces:**
- Produces: `BvmClientKanban.contactName: string | null`, `BvmClientKanban.addressId: string | null`, `BvmClientKanban.address` relation, `BvmAddress.lat: number | null`, `BvmAddress.lng: number | null`, `BvmAddress.client` back-relation. All later tasks read/write these.

- [ ] **Step 1: Edit the two models**

```prisma
model BvmClientKanban {
  id             String    @id @default(uuid())
  clientName     String
  stage          String    @default("Lead") // Lead, First Contact, Appointment Set, Closed/Won, Follow-up Needed
  lastContacted  DateTime?
  nextContacted  DateTime?
  contactNotes   String    @default("") @db.Text
  contactName    String?
  addressId      String?     @unique
  address        BvmAddress? @relation(fields: [addressId], references: [id])

  createdAt DateTime @default(now())

  @@index([stage])
  @@index([lastContacted])
  @@index([nextContacted])
}

model BvmAddress {
  id              String   @id @default(uuid())
  customerName    String
  street          String
  city            String
  state           String
  zip             String
  phone           String?
  publicationName String?
  magazineZone    String?
  sentToBvm       Boolean  @default(false)
  lat             Float?
  lng             Float?

  client BvmClientKanban?

  createdAt DateTime @default(now())

  @@index([sentToBvm])
}
```

- [ ] **Step 2: Push schema to the dev DB and regenerate the client**

Run: `npx prisma db push --accept-data-loss && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: link BvmClientKanban to BvmAddress, add geocode cache"
```

---

### Task 2: Link-address UI on Client Kanban

**Files:**
- Modify: `src/app/api/bvm/clients/route.ts:47-71` (PATCH handler)
- Modify: `src/app/(admin)/admin/bvm/clients/page.tsx`

**Interfaces:**
- Consumes: Task 1's `BvmClientKanban.contactName`/`addressId` scalar columns (no `include` needed — Prisma returns scalar columns by default).
- Produces: `PATCH /api/bvm/clients` now also accepts `{ contactName?: string; addressId?: string | null }`. Later tasks don't depend on this directly (Drop-Off Route reads via its own GET), but the data it writes is what Task 3's GET route consumes.

- [ ] **Step 1: Extend the PATCH handler**

In `src/app/api/bvm/clients/route.ts`, replace the destructure and `data` block:

```ts
    const { id, stage, lastContacted, nextContacted, contactNotes, contactName, addressId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (stage !== undefined) data.stage = stage;
    if (lastContacted !== undefined) data.lastContacted = lastContacted ? new Date(lastContacted) : null;
    if (nextContacted !== undefined) data.nextContacted = nextContacted ? new Date(nextContacted) : null;
    if (contactNotes !== undefined) data.contactNotes = contactNotes;
    if (contactName !== undefined) data.contactName = contactName;
    if (addressId !== undefined) data.addressId = addressId || null;
```

- [ ] **Step 2: Run `tsc --noEmit` to confirm the route still compiles**

Run: `npx tsc --noEmit`
Expected: no errors referencing `route.ts`.

- [ ] **Step 3: Extend `KanbanClient` interface and fetch the address list**

In `src/app/(admin)/admin/bvm/clients/page.tsx`, update the interface and add address state:

```ts
interface KanbanClient {
  id: string;
  clientName: string;
  stage: string;
  lastContacted: string | null;
  nextContacted: string | null;
  contactNotes: string;
  contactName: string | null;
  addressId: string | null;
}

interface AddressOption {
  id: string;
  customerName: string;
  street: string;
  city: string;
}
```

Add alongside the existing `clients`/`loading` state:

```ts
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
```

Add a second load effect (keep the existing `useEffect(load, [])` for clients as-is):

```ts
  useEffect(() => {
    fetch('/api/bvm/addresses')
      .then((res) => res.json())
      .then((data: AddressOption[]) => setAddresses(data.map((a) => ({ id: a.id, customerName: a.customerName, street: a.street, city: a.city }))))
      .catch(() => {});
  }, []);
```

- [ ] **Step 4: Add Contact Name + Linked Address fields to the card modal**

In the modal, immediately before the closing `<button onClick={() => setActiveCard(null)}...Close</button>`, insert:

```tsx
            <label className="text-[11px] font-mono uppercase text-slate-500 block">Contact Name</label>
            <input
              value={activeCard.contactName || ''}
              onChange={(e) => {
                updateClient(activeCard.id, { contactName: e.target.value });
                setActiveCard((c) => (c ? { ...c, contactName: e.target.value } : c));
              }}
              placeholder="Primary contact"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Linked Address</label>
            <select
              value={activeCard.addressId || ''}
              onChange={(e) => {
                const addressId = e.target.value || null;
                updateClient(activeCard.id, { addressId });
                setActiveCard((c) => (c ? { ...c, addressId } : c));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">— No address linked —</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.customerName} — {a.street}, {a.city}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">Linking an address makes this client available in Drop-Off Route.</p>
```

`updateClient` already accepts `Partial<KanbanClient>` and spreads it straight into the PATCH body, so no change to that function is needed — `contactName`/`addressId` flow through automatically.

- [ ] **Step 5: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/bvm/clients/route.ts "src/app/(admin)/admin/bvm/clients/page.tsx"
git commit -m "feat: link addresses to kanban clients from the card modal"
```

---

### Task 3: Geocoding helper + Drop-Off Route API routes

**Files:**
- Create: `src/lib/geocode.ts`
- Create: `src/app/api/bvm/drop-off-route/route.ts`
- Create: `src/app/api/bvm/drop-off-route/geocode-start/route.ts`

**Interfaces:**
- Produces: `geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null>` (used by both routes). `GET /api/bvm/drop-off-route` → `{ id, businessName, contactName, address, lat, lng }[]`. `POST /api/bvm/drop-off-route/geocode-start` body `{ address: string }` → `{ lat, lng }` or 422.

- [ ] **Step 1: Write the geocoding helper**

```ts
// src/lib/geocode.ts
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !query.trim()) return null;

  try {
    const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write the drop-off-route GET route**

```ts
// src/app/api/bvm/drop-off-route/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: clients with a linked address, geocoding+caching any that are missing lat/lng
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await prisma.bvmClientKanban.findMany({
    where: { addressId: { not: null } },
    include: { address: true },
    orderBy: { clientName: 'asc' },
  });

  // ponytail: sequential geocode-and-cache loop, fine for the expected volume
  // (dozens of stops). Parallelize with a concurrency cap if this list grows
  // into the hundreds and cold-starts start feeling slow.
  const stops = [];
  for (const c of clients) {
    if (!c.address) continue;
    let { lat, lng } = c.address;
    if (lat == null || lng == null) {
      const query = `${c.address.street}, ${c.address.city}, ${c.address.state} ${c.address.zip}`;
      const geo = await geocodeAddress(query);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        await prisma.bvmAddress.update({ where: { id: c.address.id }, data: { lat, lng } });
      }
    }
    stops.push({
      id: c.id,
      businessName: c.clientName,
      contactName: c.contactName,
      address: `${c.address.street}, ${c.address.city}, ${c.address.state} ${c.address.zip}`,
      lat,
      lng,
    });
  }

  return NextResponse.json(stops);
}
```

- [ ] **Step 3: Write the start-location geocode route**

```ts
// src/app/api/bvm/drop-off-route/geocode-start/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📍 POST: geocode the free-text starting location (not cached — changes per session)
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { address } = await request.json();
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const geo = await geocodeAddress(address);
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode address' }, { status: 422 });
  }

  return NextResponse.json(geo);
}
```

- [ ] **Step 4: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geocode.ts src/app/api/bvm/drop-off-route
git commit -m "feat: add drop-off-route data + geocoding API routes"
```

---

### Task 4: Route optimizer + map-link builders (pure logic, no UI)

**Files:**
- Create: `src/lib/routeOptimizer.ts`
- Create: `src/lib/mapLinks.ts`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces: `nearestNeighborOrder<T extends { id: string; lat: number | null; lng: number | null }>(start: {lat,lng}, stops: T[]): T[]`; `buildGoogleMapsUrl(start: string, stopAddresses: string[]): string`; `buildAppleMapsUrl(start: string, stopAddresses: string[]): string`; `buildRouteSummary(stops: {businessName: string; address: string}[]): string`. Task 5's page imports all four.

- [ ] **Step 1: Write the nearest-neighbor optimizer**

```ts
// src/lib/routeOptimizer.ts
export interface RouteStop {
  id: string;
  lat: number | null;
  lng: number | null;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ponytail: straight-line nearest-neighbor greedy sort, not real driving
// distance and not TSP-optimal. Upgrade path: swap haversineMiles for a
// Distance Matrix API call if field feedback shows ordering diverging
// meaningfully from actual driving routes.
export function nearestNeighborOrder<T extends RouteStop>(start: { lat: number; lng: number }, stops: T[]): T[] {
  const locatable = stops.filter((s) => s.lat != null && s.lng != null);
  const unlocatable = stops.filter((s) => s.lat == null || s.lng == null);

  const remaining = [...locatable];
  const ordered: T[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const dist = haversineMiles(current, { lat: stop.lat as number, lng: stop.lng as number });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    const [next] = remaining.splice(nearestIdx, 1);
    ordered.push(next);
    current = { lat: next.lat as number, lng: next.lng as number };
  }

  return [...ordered, ...unlocatable];
}
```

- [ ] **Step 2: Write the map-link builders**

```ts
// src/lib/mapLinks.ts
export function buildGoogleMapsUrl(start: string, stopAddresses: string[]): string {
  if (stopAddresses.length === 0) return '';
  const destination = stopAddresses[stopAddresses.length - 1];
  const waypoints = stopAddresses.slice(0, -1);
  const params = new URLSearchParams({ api: '1', origin: start, destination });
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Apple Maps' URL scheme only supports one destination — intermediate stops
// aren't representable, so this launches start → final stop only.
export function buildAppleMapsUrl(start: string, stopAddresses: string[]): string {
  if (stopAddresses.length === 0) return '';
  const destination = stopAddresses[stopAddresses.length - 1];
  const params = new URLSearchParams({ saddr: start, daddr: destination });
  return `https://maps.apple.com/?${params.toString()}`;
}

export function buildRouteSummary(stops: { businessName: string; address: string }[]): string {
  return stops.map((s, i) => `${i + 1}. ${s.businessName} — ${s.address}`).join('\n');
}
```

- [ ] **Step 3: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/routeOptimizer.ts src/lib/mapLinks.ts
git commit -m "feat: add nearest-neighbor route optimizer and map-link builders"
```

---

### Task 5: Drop-Off Route page + nav registration

**Files:**
- Create: `src/app/(admin)/admin/bvm/drop-off-route/page.tsx`
- Modify: `src/components/AdminNav.tsx:11-20` (`BVM_LINKS`)

**Interfaces:**
- Consumes: `GET /api/bvm/drop-off-route` (Task 3), `POST /api/bvm/drop-off-route/geocode-start` (Task 3), `nearestNeighborOrder`/`buildGoogleMapsUrl`/`buildAppleMapsUrl`/`buildRouteSummary` (Task 4).

- [ ] **Step 1: Register the subtab**

In `src/components/AdminNav.tsx`, insert into `BVM_LINKS` right after the "New Addresses" entry:

```ts
  { href: "/admin/bvm/call-consistency", label: "Call Consistency", icon: "📞" },
  { href: "/admin/bvm/conference", label: "Conference Calls", icon: "👥" },
  { href: "/admin/bvm/addresses", label: "New Addresses", icon: "📍" },
  { href: "/admin/bvm/drop-off-route", label: "Drop-Off Route", icon: "🚚" },
  { href: "/admin/bvm/appointments", label: "Appointments", icon: "🗓️" },
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(admin)/admin/bvm/drop-off-route/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Truck, Search, MapPin, Loader2, ChevronUp, ChevronDown, Navigation, AlertTriangle } from 'lucide-react';
import { nearestNeighborOrder } from '@/lib/routeOptimizer';
import { buildGoogleMapsUrl, buildAppleMapsUrl, buildRouteSummary } from '@/lib/mapLinks';

interface Stop {
  id: string;
  businessName: string;
  contactName: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function DropOffRoutePage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetch('/api/bvm/drop-off-route')
      .then((res) => res.json())
      .then(setStops)
      .catch(() => toast.error('Failed to load drop-off stops'))
      .finally(() => setLoading(false));
  }, []);

  const filteredStops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stops;
    return stops.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stops, search]);

  const stopsById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);
  const selectedStops = useMemo(
    () => selectedIds.map((id) => stopsById.get(id)).filter((s): s is Stop => Boolean(s)),
    [selectedIds, stopsById]
  );

  function toggleStop(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(filteredStops.map((s) => s.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function moveStop(index: number, direction: -1 | 1) {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function optimizeRoute() {
    if (!startAddress.trim()) {
      toast.error('Enter a starting location first');
      return;
    }
    if (selectedStops.length < 2) {
      toast.error('Select at least 2 stops to optimize');
      return;
    }

    setOptimizing(true);
    try {
      let coords = startCoords;
      if (!coords) {
        const res = await fetch('/api/bvm/drop-off-route/geocode-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: startAddress }),
        });
        if (!res.ok) throw new Error();
        coords = await res.json();
        setStartCoords(coords);
      }

      const ordered = nearestNeighborOrder(coords!, selectedStops);
      setSelectedIds(ordered.map((s) => s.id));
      toast.success('Route optimized');
    } catch {
      toast.error('Could not geocode starting location');
    } finally {
      setOptimizing(false);
    }
  }

  function openGoogleMaps() {
    if (!startAddress.trim() || selectedStops.length === 0) return;
    window.open(buildGoogleMapsUrl(startAddress, selectedStops.map((s) => s.address)), '_blank');
  }

  function openAppleMaps() {
    if (!startAddress.trim() || selectedStops.length === 0) return;
    window.open(buildAppleMapsUrl(startAddress, selectedStops.map((s) => s.address)), '_blank');
  }

  async function copySummary() {
    if (selectedStops.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildRouteSummary(selectedStops));
      toast.success('Route summary copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Drop-Off Route</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Plan and optimize a multi-stop drop-off run</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <label className="text-[11px] font-mono uppercase text-slate-500 block">Starting Location</label>
        <input
          value={startAddress}
          onChange={(e) => {
            setStartAddress(e.target.value);
            setStartCoords(null);
          }}
          placeholder="Current Location or Office Address"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients or addresses…"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white min-h-[44px]"
            />
          </div>
          <button onClick={selectAll} className="min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300">
            Select All
          </button>
          <button onClick={clearAll} className="min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300">
            Clear All
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm">
            No clients with linked addresses yet — link an address from Client Kanban.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredStops.map((s) => (
              <label
                key={s.id}
                className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[44px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleStop(s.id)}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-emerald-500"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{s.businessName}</p>
                  {s.contactName && <p className="text-xs text-slate-400">{s.contactName}</p>}
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.address}</p>
                  {(s.lat == null || s.lng == null) && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Couldn&apos;t geocode — excluded from optimization
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedStops.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Route ({selectedStops.length} stop{selectedStops.length === 1 ? '' : 's'})
            </h2>
            <button
              onClick={optimizeRoute}
              disabled={optimizing}
              className="min-h-[44px] flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 rounded-xl disabled:opacity-50"
            >
              {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⚡</span>}
              Optimize Route
            </button>
          </div>

          <div className="space-y-2">
            {selectedStops.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-[11px] font-bold font-mono">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{s.businessName}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{s.address}</p>
                </div>
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => moveStop(i, -1)}
                    disabled={i === 0}
                    className="min-h-[22px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveStop(i, 1)}
                    disabled={i === selectedStops.length - 1}
                    className="min-h-[22px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={openGoogleMaps}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <Navigation className="w-4 h-4" /> Google Maps
            </button>
            <button
              onClick={openAppleMaps}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <MapPin className="w-4 h-4" /> Apple Maps
            </button>
            <button
              onClick={copySummary}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <span>📋</span> Copy Route Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run `tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/bvm/drop-off-route/page.tsx" src/components/AdminNav.tsx
git commit -m "feat: add Drop-Off Route page and register subtab nav"
```

---

### Task 6: Full verification, merge, push

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds (`prisma generate && prisma db push --accept-data-loss && next build --webpack` all pass). Ignore any diff in `public/sw.js`/`public/workbox-*.js` — they regenerate every build and are not real changes (don't commit them unless already tracked as modified for an unrelated reason).

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, log in, open Client Kanban → link one existing address + set a contact name on a card → open Drop-Off Route → confirm the linked client appears, checkbox-select 2+ stops, enter a starting address, click Optimize Route, confirm reordering happens, click each of the three launcher buttons and confirm they behave (two open new tabs, one copies to clipboard).

- [ ] **Step 4: Merge to main and push**

```bash
git checkout main
git merge feature-drop-off-route-engine --no-ff -m "Merge branch 'feature-drop-off-route-engine' into main"
git push origin main
```

## Self-Review Notes
- **Spec coverage:** nav registration (Task 5 Step 1), data hydration (Task 3), multi-select + businessName/contactName/address display + search + Select All/Clear All (Task 5 Step 2), starting location input (Task 5 Step 2), nearest-neighbor optimizer + ⚡ button (Task 4 + 5), ▲/▼ manual reorder (Task 5 — drag-and-drop intentionally out of scope, see spec's "Out of scope"), Google Maps / Apple Maps / 📋 Copy Route Summary launchers (Task 4 + 5), 44px touch targets + safe-area padding (Task 5), tsc/build/commit/merge/push (Task 6). All covered.
- **Type consistency:** `Stop` (page) matches the GET route's JSON shape exactly (`id, businessName, contactName, address, lat, lng`). `RouteStop` (optimizer) is structurally compatible with `Stop` (both have `id`/`lat`/`lng`), and `nearestNeighborOrder` is generic so it returns `Stop[]`, not a narrowed type. `KanbanClient` in Task 2 matches the PATCH body fields added in that same task.
- **Placeholder scan:** none — every step has real code.
