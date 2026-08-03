import { prisma } from '@/lib/prisma';

// Outbound Webhook Engine — fires org-registered listener URLs (Zapier,
// Make.com, etc.) on key platform events. Every call is best-effort: a
// missing/unreachable listener is logged and swallowed so a webhook never
// breaks the request that triggered it (same posture as the SLA Discord
// alert in /api/cron/sla-check).

export type WebhookEvent = 'lead.created' | 'task.sla_breached' | 'intake.completed';

async function resolveWebhookUrl(organizationId?: string | null): Promise<string | null> {
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { webhookUrl: true },
    });
    if (org?.webhookUrl) return org.webhookUrl;
  }
  // Falls back to a single global listener when the org has none configured,
  // same env-var escape hatch /api/webhooks/dispatch already offers.
  return process.env.WEBHOOK_URL || null;
}

export async function dispatchWebhookEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  organizationId?: string | null
): Promise<void> {
  try {
    const targetUrl = await resolveWebhookUrl(organizationId);
    if (!targetUrl) {
      console.warn(`⚠️ No webhook target configured${organizationId ? ` for org ${organizationId}` : ''} — skipping "${event}".`);
      return;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        organizationId: organizationId ?? null,
        payload,
      }),
    });

    if (!res.ok) {
      console.error(`Webhook dispatch failed for "${event}": ${res.status} ${await res.text()}`);
    }
  } catch (error) {
    console.error(`Webhook dispatch error for "${event}":`, error);
  }
}
