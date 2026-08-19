const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'WhitePinePortal/1.0 (contact: cwray@bestversionmedia.com)';

// Collapse whitespace/empty-segment mess, and expand the rural county-route
// abbreviations Nominatim is strict about parsing ("CR 27" / "Co Rd 27" /
// "Co. Rd. 27" -> "County Road 27"). Number-anchored so it only fires on the
// actual route-number pattern, not any string that happens to contain "CR".
export function normalizeAddress(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/,(\s*,)+/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/\bCo\.?\s?Rd\.?\s?(\d+)/gi, 'County Road $1')
    .replace(/\bCR\s?(\d+)/gi, 'County Road $1')
    .trim();
}

async function geocodeGoogle(query: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.status === 403) return null;

    const data = await res.json();
    if (!res.ok || ['OVER_QUERY_LIMIT', 'REQUEST_DENIED', 'ZERO_RESULTS'].includes(data?.status)) return null;

    const location = data?.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}

// Free, keyless fallback -- 1 req/sec cap and a contact-bearing User-Agent
// are both required by Nominatim's usage policy. Only this tier sleeps;
// Google isn't subject to that limit.
async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!res.ok) return null;

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = parseFloat(first?.lat);
    const lng = parseFloat(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function geocodeAddress(rawQuery: string): Promise<{ lat: number; lng: number } | null> {
  if (!rawQuery.trim()) return null;
  const query = normalizeAddress(rawQuery);

  const google = await geocodeGoogle(query);
  if (google) return google;

  return geocodeNominatim(query);
}
