export const STALE_DAYS = 7;

export function staleCutoffDate(now: Date = new Date()): Date {
  return new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
}

export function isTaskStale(
  task: { status: string; isParked: boolean; updatedAt: Date },
  now: Date = new Date()
): boolean {
  return task.status !== 'DONE' && !task.isParked && task.updatedAt < staleCutoffDate(now);
}
