export interface RouteStop {
  id: string;
  lat: number | null;
  lng: number | null;
}

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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
