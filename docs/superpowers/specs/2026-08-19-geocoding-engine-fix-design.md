# Robust Geocoding Fix — Design

## 1. Dual-tier geocoding, centralized
Both call sites (`/api/bvm/drop-off-route` GET and `/api/bvm/drop-off-route/geocode-start` POST) already route through the single `geocodeAddress()` helper in `src/lib/geocode.ts` — fixing it there fixes both without touching either route file.

`geocode.ts` gets:
- `normalizeAddress(raw)`: collapse repeated whitespace, trim, drop empty comma-separated segments (`", ,"` / `",,"` → `,`), strip stray space before a comma, and expand rural county-route abbreviations Nominatim is strict about — `CR 27` / `Co Rd 27` / `Co. Rd. 27` → `County Road 27` (number-anchored regex, so it only fires on the actual route-number pattern, not any string containing "CR").
- `geocodeGoogle(query)`: unchanged logic, reads `GOOGLE_MAPS_API_KEY` first then falls back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (spec lists both as acceptable sources). Returns `null` on missing key, non-2xx, HTTP 403, or a Google `status` of `OVER_QUERY_LIMIT` / `REQUEST_DENIED` / `ZERO_RESULTS` — i.e. any Google failure mode falls through to the next tier rather than propagating.
- `geocodeNominatim(query)`: `https://nominatim.openstreetmap.org/search?format=json&q=...&limit=1`. Nominatim's usage policy requires a `User-Agent` identifying the app (with contact info) and caps at 1 request/second — sets both, and only this path (the fallback, not the primary Google path) sleeps 1s first since it's the one subject to that limit.
- `geocodeAddress(rawQuery)` becomes: normalize → try Google → try Nominatim → `null`. Same public signature as before, so no caller changes needed.

Net effect: a Google failure (quota, key missing, zero results) no longer means "ungeocoded forever" — Nominatim is a free, keyless second attempt.

## 2. Client-side graceful fallback (already mostly true — verified, then polished)
Checked the actual behavior before changing anything:
- `nearestNeighborOrder()` already appends stops with no `lat`/`lng` to the end rather than dropping them — they stay selectable, reorderable (▲/▼), and included in the route.
- `buildGoogleMapsUrl` / `buildAppleMapsUrl` / the single-leg nav builders all take **address strings**, never coordinates — launching Maps has never depended on our geocode succeeding; Google/Apple do their own geocoding when the link opens. Already true, not new.
- The one real gap: `optimizeRoute()`'s catch block, on a failed start-location geocode, only toasts an error — it doesn't clarify that the stops are still usable in their current (manual/selection) order. Rewording the toast to say so, so the user isn't left thinking the whole action failed.
- The per-stop "Couldn't geocode" badge said "excluded from optimization," which reads as "excluded from the route." Rewording to "kept in manual order — Maps will still navigate to it directly," which is what's actually true.

No behavior changes needed beyond copy — the graceful fallback the spec asks for already exists structurally; the wording was misleading about it.

## 3. Re-Geocode All Addresses
New `POST /api/bvm/drop-off-route/re-geocode`: loads **every** `BvmAddress` row (not just ones linked to a client — spec says "all existing saved client addresses in `prisma.bvmAddress`," and the address book has entries that predate any client link), force-re-runs `geocodeAddress` on each (ignores any existing cached `lat`/`lng` — that's the point of "force re-run"), writes results back, returns `{ total, succeeded, failed }`. Sequential loop, same ponytail tradeoff already accepted in the GET route's existing geocode-and-cache pass (and now additionally bound by Nominatim's 1 req/s on any address that falls back to it) — fine for a manual admin maintenance action, not a hot path.

"🔄 Re-Geocode All Addresses" button added to the Drop-Off Route page header, calls the endpoint, toasts the `succeeded/total` summary, then refetches `/api/bvm/drop-off-route` so the list picks up fresh coordinates.

## Out of scope
- No retry/backoff loop beyond the two tiers — a third geocoder is a future ask, not this one.
- No UI for reviewing which specific addresses failed re-geocoding beyond the summary count (the per-stop "Couldn't geocode" badge in the main list already surfaces that per-address, post-refetch).
