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
