// Shared between the fulfillment board's manual stage-change endpoint and
// the auto-completion webhook — both need to recompute the SLA deadline the
// same way whenever a task's stage moves.

export const SLA_WINDOW_DAYS = 3;

export const FULFILLMENT_STAGES = ['Intake Pending', 'Content Uploaded', 'Setup Live', 'Active Retainer'];

export function slaDeadlineFor(status: string, from: Date): Date | null {
  if (status === 'Active Retainer') return null;
  return new Date(from.getTime() + SLA_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
