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
