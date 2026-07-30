import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const kpis = await prisma.clientKpi.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(kpis);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch CMO KPIs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId = 'default-org', metricName, currentValue, targetValue, unit, period } = await req.json();

    if (!metricName) {
      return NextResponse.json({ error: 'Metric name is required' }, { status: 400 });
    }

    const kpi = await prisma.clientKpi.create({
      data: {
        organizationId,
        metricName,
        currentValue: Number(currentValue) || 0,
        targetValue: Number(targetValue) || 100,
        unit: unit || '',
        period: period || 'Q3 2026',
      },
    });

    return NextResponse.json(kpi);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create KPI' }, { status: 500 });
  }
}