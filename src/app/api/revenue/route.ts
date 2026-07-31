import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_RECENT_DAYS = 7;
const LOGIN_STALE_DAYS = 30;

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

type HealthScore = 'Healthy' | 'Warning' | 'Churn Risk';

function scoreClient(params: {
  lastLoginAt: Date | null;
  slaPassRate: number | null;
  activeLeadVolume: number;
  now: number;
}): HealthScore {
  const { lastLoginAt, slaPassRate, activeLeadVolume, now } = params;

  const loginDays = lastLoginAt ? (now - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
  const loginPoints = loginDays <= LOGIN_RECENT_DAYS ? 2 : loginDays <= LOGIN_STALE_DAYS ? 1 : 0;

  // No fulfillment history yet reads as neutral, not a red flag.
  const slaPoints = slaPassRate === null ? 1 : slaPassRate >= 90 ? 2 : slaPassRate >= 70 ? 1 : 0;

  const leadPoints = activeLeadVolume >= 5 ? 2 : activeLeadVolume >= 1 ? 1 : 0;

  const total = loginPoints + slaPoints + leadPoints;
  if (total >= 4) return 'Healthy';
  if (total >= 2) return 'Warning';
  return 'Churn Risk';
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const organizations = await prisma.organization.findMany({
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' } },
        members: { include: { user: true } },
        fulfillmentTasks: { select: { slaDeadline: true } },
        portalLeads: { select: { createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalMrr = 0;
    let baselineMrr = 0; // active subs that already existed 30+ days ago — MoM comparison point
    let activeRetainers = 0;

    const clients = organizations
      .map((org) => {
        const activeSub = org.subscriptions.find((s) => s.status === 'ACTIVE');
        const mrr = activeSub?.amount ?? 0;

        if (activeSub) {
          totalMrr += mrr;
          activeRetainers += 1;
          if (activeSub.createdAt <= thirtyDaysAgo) baselineMrr += mrr;
        }

        const lastLoginAt = org.members.reduce<Date | null>((latest, m) => {
          const t = m.user.lastLoginAt;
          if (!t) return latest;
          return !latest || t > latest ? t : latest;
        }, null);

        const slaTasks = org.fulfillmentTasks.filter((t) => t.slaDeadline !== null);
        const slaPassRate =
          slaTasks.length === 0
            ? null
            : Math.round((slaTasks.filter((t) => t.slaDeadline! > now).length / slaTasks.length) * 100);

        const activeLeadVolume = org.portalLeads.filter((l) => l.createdAt >= thirtyDaysAgo).length;

        const healthScore = scoreClient({ lastLoginAt, slaPassRate, activeLeadVolume, now: now.getTime() });

        return {
          organizationId: org.id,
          organizationName: org.name,
          planName: activeSub?.planName ?? null,
          subscriptionStatus: activeSub?.status ?? org.subscriptions[0]?.status ?? 'NONE',
          mrr,
          lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
          slaPassRate,
          activeLeadVolume,
          healthScore,
          contactEmail: org.members[0]?.user.email ?? null,
        };
      })
      // Only show clients that have (or had) a retainer — this is a revenue
      // radar, not a full account directory.
      .filter((c) => c.subscriptionStatus !== 'NONE');

    const mrrGrowthPct = baselineMrr > 0 ? Math.round(((totalMrr - baselineMrr) / baselineMrr) * 1000) / 10 : null;
    const avgRetainerValue = activeRetainers > 0 ? Math.round(totalMrr / activeRetainers) : 0;

    return NextResponse.json(
      {
        metrics: { totalMrr, mrrGrowthPct, activeRetainers, avgRetainerValue },
        clients,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Revenue radar query failed:', error);
    return NextResponse.json({ error: 'Failed to load revenue data' }, { status: 500 });
  }
}
