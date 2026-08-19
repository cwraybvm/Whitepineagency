import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here. /fulfillment
// allows OWNER + OPERATOR (see proxy.ts's route matrix).
async function requireStaff() {
  const store = await cookies();
  const role = store.get('role')?.value;
  return role === 'OWNER' || role === 'OPERATOR';
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const VELOCITY_DAYS = 14;
const USAGE_WINDOW_DAYS = 30;

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const velocitySince = new Date(now.getTime() - VELOCITY_DAYS * 24 * 60 * 60 * 1000);
  const usageSince = new Date(now.getTime() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [completedTasks, fulfillmentTasks, leads, contentByOrg, fulfillmentByOrg, activeOrgs] = await Promise.all([
    prisma.task.findMany({
      where: { status: 'DONE', completedAt: { gte: velocitySince } },
      select: { completedAt: true },
    }),
    prisma.fulfillmentTask.findMany({
      select: { status: true, slaDeadline: true },
    }),
    prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
    }),
    prisma.contentPost.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: usageSince } },
      _count: { _all: true },
    }),
    prisma.fulfillmentTask.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: usageSince }, organizationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    }),
  ]);

  // 1. Task Completion Velocity -- daily DONE count over the trailing window,
  // zero-filled so gaps in a day's completions still render as a bar.
  const velocityByDay = new Map<string, number>();
  for (let i = 0; i < VELOCITY_DAYS; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    velocityByDay.set(dateKey(d), 0);
  }
  for (const t of completedTasks) {
    if (!t.completedAt) continue;
    const key = dateKey(t.completedAt);
    if (velocityByDay.has(key)) velocityByDay.set(key, (velocityByDay.get(key) || 0) + 1);
  }
  const taskVelocity = Array.from(velocityByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  // 2. SLA Compliance Rate -- share of fulfillment tasks with a deadline that
  // haven't blown past it (a delivered task's deadline is a wash by then;
  // an in-flight task is only "compliant" while its clock hasn't run out).
  const withDeadline = fulfillmentTasks.filter((t) => t.slaDeadline);
  const onTime = withDeadline.filter((t) => t.status === 'Active Retainer' || (t.slaDeadline as Date) >= now);
  const slaComplianceRate = withDeadline.length > 0 ? Math.round((onTime.length / withDeadline.length) * 1000) / 10 : 100;
  const slaBreakdown = {
    onTime: onTime.length,
    breached: withDeadline.length - onTime.length,
    total: withDeadline.length,
  };

  // 3. Active Client Usage -- content + fulfillment activity per client over
  // the trailing window, top 8 by combined volume.
  const usageByOrg = new Map<string, number>();
  for (const row of contentByOrg) {
    if (!row.organizationId) continue;
    usageByOrg.set(row.organizationId, (usageByOrg.get(row.organizationId) || 0) + row._count._all);
  }
  for (const row of fulfillmentByOrg) {
    if (!row.organizationId) continue;
    usageByOrg.set(row.organizationId, (usageByOrg.get(row.organizationId) || 0) + row._count._all);
  }
  const orgNameById = new Map(activeOrgs.map((o) => [o.id, o.name]));
  const activeClientUsage = Array.from(usageByOrg.entries())
    .map(([organizationId, count]) => ({ organizationId, name: orgNameById.get(organizationId) || 'Unknown Client', count }))
    .filter((row) => orgNameById.has(row.organizationId))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 4. Lead Conversion Rates -- count by pipeline stage + overall Closed Won rate.
  const totalLeads = leads.reduce((sum, row) => sum + row._count._all, 0);
  const closedWon = leads.find((row) => row.stage === 'Closed Won')?._count._all || 0;
  const leadConversion = {
    byStage: leads.map((row) => ({ stage: row.stage, count: row._count._all })).sort((a, b) => b.count - a.count),
    totalLeads,
    closedWon,
    conversionRate: totalLeads > 0 ? Math.round((closedWon / totalLeads) * 1000) / 10 : 0,
  };

  return NextResponse.json({
    generatedAt: now.toISOString(),
    taskVelocity,
    slaComplianceRate,
    slaBreakdown,
    activeClientUsage,
    leadConversion,
  });
}
