# Drop-Off Execution Checklist + GPS Radar — Design

## 1. Execution mode / turn-by-turn checklist
"🚀 Start Drop-Off Route" appears next to the existing route header once `selectedStops.length > 0` (same gate as the existing Route section). Toggles `executionMode` — while active, the checklist replaces the plain ordered-stop list + Optimize/reorder controls (turn-by-turn is a different task than planning the route; showing both at once is clutter), with an "Exit" button to go back to planning.

Each checklist row: sequence number, business name, contact name, address, and (if the linked `BvmAddress.phone` is set) a `tel:` call link — all ≥44px. `Stop`'s GET route (`/api/bvm/drop-off-route`) doesn't currently select `phone`; extending its per-stop object with `phone: c.address.phone`.

**Per-stop "Navigate to Stop"** — single-leg, not multi-stop: `mapLinks.ts` gets `buildSingleGoogleMapsUrl(destination)` / `buildSingleAppleMapsUrl(destination)`, both destination-only (no origin param) — Google Maps and Apple Maps both default the origin to the device's live location when omitted, which is what "navigate to this one stop from wherever I am right now mid-route" actually needs (using the *route's* starting address, or the previous stop, would be wrong once the driver has moved).

**"✅ Mark Dropped Off"** — new `POST /api/bvm/drop-off-route/mark-dropped-off` with `{ clientId }`. Server-side (atomic, single read-then-write — fine for a single-operator tool, no transaction needed): fetches the client, sets `stage: 'Magazine Dropped'`, and appends `\n[Drop-Off Completed: {formatted timestamp}]` to `contactNotes` (not an overwrite — existing notes are preserved). Timestamp formatted as `Aug 19, 2026 at 3:30 PM` (`toLocaleDateString` + `toLocaleTimeString`, joined with `" at "` — `toLocaleString` alone punctuates with a comma, not "at").

`'Magazine Dropped'` isn't in Client Kanban's `STAGES` list — without adding it there, a dropped-off client's card would silently vanish from every kanban column (none of the column filters would match its stage). Adding it as a 6th `STAGES` entry in `bvm/clients/page.tsx` so completed clients stay visible.

Completion state (`completedIds`) is session-local (a `Set` in page state, not persisted beyond `stage`/`contactNotes`) — a page reload starts a fresh checklist run, which is correct: the source of truth for "was this dropped off" is the client's stage/notes, not a run-tracking table nobody asked for. Completed rows get strikethrough + dimmed styling and their action buttons replaced with a static "✅ Dropped Off" badge; header shows `n / total Drop-Offs Completed`.

## 2. GPS radar ("Find Clients Near Me")
Operates on the page's already-loaded `stops` array — not a new endpoint. The radar's whole point is to let the user add nearby *clients* to the *route selector*, and only clients already in `stops` (linked + geocoded) are addable to that selector, so there's nothing to gain from querying raw `BvmAddress` rows that aren't tied to a routable client.

`routeOptimizer.ts`'s `haversineMiles` becomes exported (was module-private) and reused here instead of duplicating the distance math.

Flow: "📍 Find Clients Near Me" → `navigator.geolocation.getCurrentPosition` → on success, compute `haversineMiles(userCoords, stop)` for every stop with non-null `lat`/`lng`, filter to the selected radius (1/3/5/10 mi, default 5), sort ascending. Results list shows `businessName — 0.8 miles away`; "+ Add Nearby Clients to Route" appends every result's id into `selectedIds` (skipping ones already selected, no duplicates).

Geolocation error handling — `getCurrentPosition`'s error callback gets a message per `error.code`:
- `PERMISSION_DENIED` (1): "Location access denied — enable it in your browser/device settings to use the radar."
- `POSITION_UNAVAILABLE` (2): "Couldn't determine your location — try again in a moment."
- `TIMEOUT` (3): "Location request timed out — try again."
- `navigator.geolocation` undefined entirely (older/non-HTTPS context): caught before calling, "Geolocation isn't available in this browser."

## Out of scope
- No persisted "drop-off run" table — `stage` + `contactNotes` on the existing client record are the only state this writes, per spec's own field list.
- No real driving-distance API for the radar — haversine straight-line, consistent with the rest of Drop-Off Route's existing distance math (`nearestNeighborOrder`), not a new inconsistency.
