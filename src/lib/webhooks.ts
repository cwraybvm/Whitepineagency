import { randomUUID, createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

// Outbound Webhook Engine — fires org-registered listener URLs (Zapier,
// Make.com, etc.) on key platform events. Every call is best-effort: a
// missing/unreachable listener is logged and swallowed so a webhook never
// breaks the request that triggered it (same posture as the SLA Discord
// alert in /api/cron/sla-check).

export type WebhookEvent =
  | 'lead.created'
  | 'task.sla_breached'
  | 'intake.completed'
  // Creative-sandbox auto-fulfill lifecycle — see src/lib/sandboxAutoFulfill.ts
  | 'asset.staged'
  | 'asset.production'
  | 'asset.failed'
  // Landing Page Studio deploy — see src/app/api/sandbox/landing-page/deploy-webhook/route.ts
  | 'landing_page.exported';

export interface WebhookDeliveryAttempt {
  attempt: number;
  ok: boolean;
  status?: number;
  error?: string;
  delayMsBeforeAttempt: number;
}

export interface WebhookDispatchOptions {
  // Opt-in only — the 3 pre-existing call sites (leads, SLA, intake) don't
  // pass this, so their delivery stays exactly as it was: unsigned, single
  // attempt. Only the sandbox auto-fulfill/scenario paths opt in.
  sign?: boolean;
  retry?: boolean;
  // Lets the sandbox scenario runner target an explicit URL (e.g. a
  // deliberately hanging one for the webhook_timeout scenario) instead of
  // resolving one from the org/env.
  targetUrlOverride?: string;
}

export interface WebhookDispatchResult {
  eventId: string;
  delivered: boolean;
  targetUrl: string | null;
  attempts: WebhookDeliveryAttempt[];
}

// Short, serverless-timeout-safe backoff — a scenario-runner request needs to
// return synchronously, so this stays well under typical function limits
// even at 3 retries (worst case ~2.5s of sleeping).
const RETRY_DELAYS_MS = [250, 750, 1500];

// Bounds a single delivery attempt so a hanging/unresponsive endpoint (the
// webhook_timeout scenario, or a real listener that's down) can't stall the
// request past the serverless function's own max duration.
const ATTEMPT_TIMEOUT_MS = 5000;

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

function sign(body: string, timestamp: string, eventId: string): string | null {
  const secret = process.env.SANDBOX_WEBHOOK_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${timestamp}.${eventId}.${body}`).digest('hex');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchWebhookEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  organizationId?: string | null,
  options: WebhookDispatchOptions = {}
): Promise<WebhookDispatchResult> {
  const eventId = randomUUID();
  const attempts: WebhookDeliveryAttempt[] = [];

  try {
    const targetUrl = options.targetUrlOverride ?? (await resolveWebhookUrl(organizationId));
    if (!targetUrl) {
      console.warn(`⚠️ No webhook target configured${organizationId ? ` for org ${organizationId}` : ''} — skipping "${event}".`);
      return { eventId, delivered: false, targetUrl: null, attempts };
    }

    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      event,
      event_id: eventId,
      timestamp,
      organizationId: organizationId ?? null,
      payload,
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.sign) {
      headers['x-sandbox-event-id'] = eventId;
      headers['x-sandbox-timestamp'] = timestamp;
      const signature = sign(body, timestamp, eventId);
      if (signature) headers['x-sandbox-signature'] = `sha256=${signature}`;
    }

    const maxAttempts = options.retry ? RETRY_DELAYS_MS.length + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMsBeforeAttempt = attempt === 1 ? 0 : RETRY_DELAYS_MS[attempt - 2];
      if (delayMsBeforeAttempt > 0) await sleep(delayMsBeforeAttempt);

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });
        if (res.ok) {
          attempts.push({ attempt, ok: true, status: res.status, delayMsBeforeAttempt });
          return { eventId, delivered: true, targetUrl, attempts };
        }
        const text = await res.text().catch(() => '');
        attempts.push({ attempt, ok: false, status: res.status, error: text.slice(0, 500), delayMsBeforeAttempt });
        console.error(`Webhook dispatch failed for "${event}" (attempt ${attempt}/${maxAttempts}): ${res.status} ${text}`);
      } catch (error) {
        attempts.push({
          attempt,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          delayMsBeforeAttempt,
        });
        console.error(`Webhook dispatch error for "${event}" (attempt ${attempt}/${maxAttempts}):`, error);
      }
    }

    return { eventId, delivered: false, targetUrl, attempts };
  } catch (error) {
    console.error(`Webhook dispatch setup error for "${event}":`, error);
    return { eventId, delivered: false, targetUrl: null, attempts };
  }
}
