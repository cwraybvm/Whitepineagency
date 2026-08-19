# Drop-Off Route Engine — Design

## Purpose
Give BVM ops a subtab that turns saved client addresses into an optimized driving route with one-tap navigation launchers, so a rep can plan a multi-stop drop-off run without manually sequencing stops in Google Maps.

## Schema changes
`prisma/schema.prisma`, new migration:

- `BvmClientKanban`: add `contactName String?`, `addressId String? @unique`, relation `address BvmAddress? @relation(fields: [addressId], references: [id])`
- `BvmAddress`: add `lat Float?`, `lng Float?` (geocode cache), back-relation `client BvmClientKanban?`

`clientName` is left as-is (used elsewhere as the kanban card's display name); it doubles as "business name" for route display. No existing field is renamed.

## Linking clients to addresses
The Client Kanban card modal (`src/app/(admin)/admin/bvm/clients/page.tsx`) gets a new "Address" section: a `<select>` of `BvmAddress` rows (by `customerName` + street) and a `Contact Name` input. `PATCH /api/bvm/clients` (`src/app/api/bvm/clients/route.ts`) accepts optional `addressId` and `contactName` alongside its existing fields.

## Data hydration
`GET /api/bvm/drop-off-route` (new route):
1. `prisma.bvmClientKanban.findMany({ where: { addressId: { not: null } }, include: { address: true } })`
2. For any included address missing `lat`/`lng`, geocode via Google Geocoding API (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, server-side `fetch`, no new dependency) and persist via `prisma.bvmAddress.update`. Geocode failures are skipped (stop still listed, excluded from optimization — flagged in the UI).
3. Response: `{ id, businessName, contactName, address: "street, city, state zip", lat, lng }[]`

## Route Optimization Engine
- Start location: free-text input (client-side state, defaults to empty / placeholder "Current Location or Office Address").
- `POST /api/bvm/drop-off-route/geocode-start` (new route): `{ address: string }` → `{ lat, lng }`, geocoded per-request (not cached — changes every session).
- "⚡ Optimize Route" button: geocodes the start address (if not already geocoded this session), then runs a greedy nearest-neighbor sort client-side (haversine distance) over the selected stops' `lat`/`lng`, starting from the start point. Pure client-side after the one geocode call — no TSP solver dependency.
- Stops missing lat/lng (geocode failed) are left at the end, unsorted, with a warning badge.

## Client Selection Panel
- Checkbox list: `businessName`, `contactName`, formatted `address`. Min 44px touch target per row.
- Search input filters by business name, contact name, or address substring (client-side).
- "Select All" / "Clear All" buttons.

## Manual reorder
Selected stops render as an ordered list below the panel once at least one is checked. `▲`/`▼` buttons swap adjacent stops (no drag library — matches ponytail's "fewest deps" default; drag-and-drop is a stretch goal, not required for MVP since arrow buttons cover the same reordering need).

## Navigation launchers
- **Google Maps**: `https://www.google.com/maps/dir/?api=1&origin={encodeURIComponent(start)}&destination={encodeURIComponent(lastStopAddress)}&waypoints={middleStops.map(encodeURIComponent).join('|')}`, opened via `window.open(url, '_blank')`.
- **Apple Maps**: `https://maps.apple.com/?saddr={encodeURIComponent(start)}&daddr={encodeURIComponent(lastStopAddress)}` (Apple Maps URL scheme only supports a single destination + start; intermediate stops aren't representable in the URL API, so this launches start → final stop only, same limitation Apple's own scheme has).
- **📋 Copy Route Summary**: `navigator.clipboard.writeText(...)` of a formatted numbered list (`1. Business Name — Address`) for texting.

## Navigation registration
`src/components/AdminNav.tsx` `BVM_LINKS`: insert `{ href: "/admin/bvm/drop-off-route", label: "Drop-Off Route", icon: "🚚" }` immediately after the "New Addresses" entry. This single array drives both the desktop sidebar drawer and the mobile subtab strip (`bvm/layout.tsx` reads it too) — no other nav file needs touching.

## Mobile UI
Page wrapper follows the existing BVM page convention: `px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8` with `space-y-6`/`gap-4` between sections. Checkboxes and action buttons sized `min-h-[44px]`.

## Error handling
- No linked clients yet → empty state pointing to Client Kanban's new Address section.
- Geocode failure (start or stop) → toast + inline badge, doesn't block the rest of the flow.
- Clipboard/window.open failures → toast only (both are best-effort browser APIs).

## Out of scope
- Real driving-distance/duration (haversine is straight-line, not routed) — acceptable approximation per Recommended option; a real TSP/Directions-API solve is a future upgrade if straight-line ordering proves inaccurate in the field.
- Drag-and-drop reordering (arrow buttons cover it).
