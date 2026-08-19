// Sunday-start calendar week containing `dateStr` (YYYY-MM-DD), matching
// /api/bvm/reports' own weekly window math.
export function weekRange(dateStr: string): { start: string; end: string } {
  const anchor = new Date(`${dateStr}T00:00:00.000Z`);
  const start = new Date(anchor);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
