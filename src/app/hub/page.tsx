import { db } from '@/lib/db';
import HubLaunchpad, { type HubMetrics } from './HubLaunchpad';

// Live counts vary per request; never bake them into the static build output.
export const dynamic = 'force-dynamic';

async function getMetrics(): Promise<HubMetrics> {
  try {
    const [activeLeads, activeRetainers, liveOrgs, unreadSignals] = await Promise.all([
      db.lead.count({ where: { stage: { notIn: ['Closed Won', 'Closed Lost'] } } }),
      db.subscription.count({ where: { status: 'ACTIVE' } }),
      db.organization.count({ where: { status: 'ACTIVE' } }),
      db.inboxMessage.count({ where: { isRead: false } }),
    ]);
    return { activeLeads, activeRetainers, liveOrgs, unreadSignals };
  } catch (err) {
    console.warn('⚠️ Hub metrics query bypassed, DB unreachable:', err);
    return { activeLeads: null, activeRetainers: null, liveOrgs: null, unreadSignals: null };
  }
}

export default async function HubPage() {
  const metrics = await getMetrics();
  return <HubLaunchpad metrics={metrics} />;
}
