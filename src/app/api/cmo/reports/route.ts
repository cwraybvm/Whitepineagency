import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const reports = await prisma.monthlyReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch CMO reports' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId = 'default-org', title, monthPeriod, loomEmbedUrl, summaryNotes } = await req.json();

    // Capture frozen snapshot of KPIs & Published Content Posts
    const kpis = await prisma.clientKpi.findMany({ where: { organizationId } });
    const publishedPostsCount = await prisma.contentPost.count({
      where: { organizationId, status: 'PUBLISHED' },
    });

    const report = await prisma.monthlyReport.create({
      data: {
        organizationId,
        title: title || `${monthPeriod || 'Monthly'} Performance Summary`,
        monthPeriod: monthPeriod || '2026-07',
        loomEmbedUrl,
        summaryNotes,
        metricsSnapshot: {
          kpis,
          publishedPostsCount,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}