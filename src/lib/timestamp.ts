// Shared by every "append a timestamped note" flow (drop-off completion,
// voice memos) so there's one date-format implementation, not three.
export function formatTimestamp(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} at ${timePart}`;
}
