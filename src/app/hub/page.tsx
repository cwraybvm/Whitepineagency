import { db } from '@/lib/db';
import HubLaunchpad, { type HubMetrics } from './HubLaunchpad';

// Live counts vary per request; never bake them into the static build output.
export const dynamic = 'force-dynamic';

async function getMetrics(): Promise<HubMetrics> {
  try {
    const now = new Date();
    const [activeLeads, fulfillmentTotal, fulfillmentBreached, liveOrgs, unreadSignals] = await Promise.all([
      db.lead.count({ where: { stage: { notIn: ['Closed Won', 'Closed Lost'] } } }),
      db.fulfillmentTask.count(),
      db.fulfillmentTask.count({ where: { slaDeadline: { lt: now } } }),
      db.organization.count({ where: { status: 'ACTIVE' } }),
      db.inboxMessage.count({ where: { isRead: false } }),
    ]);
    return {
      activeLeads,
      fulfillmentOnTrack: fulfillmentTotal - fulfillmentBreached,
      fulfillmentTotal,
      liveOrgs,
      unreadSignals,
    };
  } catch (err) {
    console.warn('⚠️ Hub metrics query bypassed, DB unreachable:', err);
    return { activeLeads: null, fulfillmentOnTrack: null, fulfillmentTotal: null, liveOrgs: null, unreadSignals: null };
  }
}

export default async function HubPage() {
  const metrics = await getMetrics();
  return <HubLaunchpad metrics={metrics} />;
}
