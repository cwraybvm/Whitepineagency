import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

// Scheduled by the top-level vercel.json (`crons`) — currently once daily,
// because Vercel's Hobby plan only allows daily-granularity cron triggers.
// On Pro, tighten that schedule (e.g. "*/15 * * * *") for near-real-time
// alerting.

const ALERT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

function formatRemaining(deadline: Date, now: Date): string {
  const diffMs = deadline.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const span = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return diffMs <= 0 ? `Breached ${span} ago` : `${span} remaining`;
}

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET
// is set on the project. Without it, this endpoint would be an
// unauthenticated trigger anyone could hit to spam the webhook — so verify
// it when configured, and just warn (not block) when it isn't, same
// graceful-degradation posture as the missing-webhook-URL case below.
function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('⚠️ CRON_SECRET not set — /api/cron/sla-check is running unauthenticated.');
    return true;
  }
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

// ponytail: no alertedAt/dedup tracking — a task still inside the risk
// window re-alerts on every cron tick. Add a lastAlertedAt field + a
// "only alert if it changed tier or N minutes passed" guard if the
// channel gets spammy.
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + ALERT_WINDOW_MS);

    // Tasks with a null slaDeadline (Active Retainer stage) have no SLA and
    // are excluded by the `not: null` filter — same convention the
    // fulfillment board itself uses.
    const atRiskTasks = await prisma.fulfillmentTask.findMany({
      where: { slaDeadline: { not: null, lte: windowEnd } },
      orderBy: { slaDeadline: 'asc' },
    });

    if (atRiskTasks.length === 0) {
      return NextResponse.json({ success: true, alerted: 0 });
    }

    const breachedTasks = atRiskTasks.filter((t) => t.slaDeadline!.getTime() <= now.getTime());
    const breachedCount = breachedTasks.length;

    await Promise.all(
      breachedTasks.map((t) =>
        dispatchWebhookEvent(
          'task.sla_breached',
          { taskId: t.id, title: t.title, clientName: t.clientName, status: t.status, slaDeadline: t.slaDeadline },
          t.organizationId
        )
      )
    );

    const lines = atRiskTasks.map((t) => {
      const isBreached = t.slaDeadline!.getTime() <= now.getTime();
      return `${isBreached ? '🔴' : '🟡'} **${t.title}** — ${t.clientName} · \`${t.status}\` · ${formatRemaining(t.slaDeadline!, now)}`;
    });

    const payload = {
      content:
        `🚨 **SLA Alert — ${atRiskTasks.length} task${atRiskTasks.length === 1 ? '' : 's'} at risk** ` +
        `(${breachedCount} breached, ${atRiskTasks.length - breachedCount} within 2h)\n\n` +
        lines.join('\n'),
    };

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`SLA alert webhook failed: ${res.status} ${await res.text()}`);
      }
    } else {
      console.warn('⚠️ DISCORD_WEBHOOK_URL not set — logging SLA alert instead of dispatching:');
      console.log(payload.content);
    }

    return NextResponse.json({ success: true, alerted: atRiskTasks.length, breached: breachedCount });
  } catch (error) {
    console.error('SLA check cron failed:', error);
    return NextResponse.json({ error: 'SLA check failed' }, { status: 500 });
  }
}
