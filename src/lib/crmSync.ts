// CRM webhook sync — pushes intake/quote events to GoHighLevel or Make.com.
// Best-effort: a missing/unreachable webhook must never break the caller.

export interface CrmSyncPayload {
  event: string;
  [key: string]: unknown;
}

export async function pushToCrmWebhook(payload: CrmSyncPayload): Promise<void> {
  const webhookUrl = process.env.GOHIGHLEVEL_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`CRM sync skipped for "${payload.event}" — no GOHIGHLEVEL_WEBHOOK_URL or MAKE_WEBHOOK_URL configured.`, payload);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), ...payload }),
    });
    if (!res.ok) {
      console.error(`CRM webhook push failed for "${payload.event}": ${res.status} ${await res.text().catch(() => '')}`);
    }
  } catch (error) {
    console.error(`CRM webhook push error for "${payload.event}":`, error);
  }
}
