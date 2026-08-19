export const COLD_ACCOUNT_DAYS = 30;

export function isColdAccount(lastContacted: string | null): boolean {
  if (!lastContacted) return false;
  const days = (Date.now() - new Date(lastContacted).getTime()) / (1000 * 60 * 60 * 24);
  return days > COLD_ACCOUNT_DAYS;
}
