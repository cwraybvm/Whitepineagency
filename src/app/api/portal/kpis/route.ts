import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';

const GOAL_METRIC = 'Monthly Revenue Goal';
const RETAINER_METRIC = 'Monthly Retainer';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);
  const period = currentPeriod();

  const [goalRow, retainerRow] = await Promise.all([
    prisma.clientKpi.findFirst({ where: { organizationId, metricName: GOAL_METRIC, period } }),
    prisma.clientKpi.findFirst({ where: { organizationId, metricName: RETAINER_METRIC, period } }),
  ]);

  return NextResponse.json({
    goal: goalRow?.targetValue ?? 5000,
    retainer: retainerRow?.currentValue ?? 599,
  });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);
  const period = currentPeriod();
  const body = await request.json();

  if (typeof body.goal === 'number') {
    const existing = await prisma.clientKpi.findFirst({ where: { organizationId, metricName: GOAL_METRIC, period } });
    if (existing) {
      await prisma.clientKpi.update({ where: { id: existing.id }, data: { targetValue: body.goal } });
    } else {
      await prisma.clientKpi.create({
        data: { organizationId, metricName: GOAL_METRIC, period, targetValue: body.goal, currentValue: 0, unit: '$' },
      });
    }
  }

  if (typeof body.retainer === 'number') {
    const existing = await prisma.clientKpi.findFirst({ where: { organizationId, metricName: RETAINER_METRIC, period } });
    if (existing) {
      await prisma.clientKpi.update({ where: { id: existing.id }, data: { currentValue: body.retainer } });
    } else {
      await prisma.clientKpi.create({
        data: { organizationId, metricName: RETAINER_METRIC, period, currentValue: body.retainer, targetValue: body.retainer, unit: '$' },
      });
    }
  }

  return NextResponse.json({ success: true });
}
