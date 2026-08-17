import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

function avgDays(pairs: { start: Date; end: Date }[]): number | null {
  if (pairs.length === 0) return null;
  const totalMs = pairs.reduce((sum, p) => sum + (p.end.getTime() - p.start.getTime()), 0);
  return Math.round((totalMs / pairs.length / 86400000) * 10) / 10;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const windowDays: 30 | 60 = searchParams.get('days') === '60' ? 60 : 30;

  const [subscriptions, tasks, expenses] = await Promise.all([
    prisma.subscription.findMany({ where: { organizationId: id } }),
    prisma.task.findMany({ where: { organizationId: id } }),
    prisma.expense.findMany({ where: { organizationId: id } }),
  ]);

  // Revenue — Subscription is the proxy for "invoice" data; no Invoice model exists.
  const paidAmount = subscriptions.filter((s) => s.status === 'ACTIVE').reduce((sum, s) => sum + s.amount, 0);
  const outstanding = subscriptions.filter((s) => s.status === 'PAST_DUE').reduce((sum, s) => sum + s.amount, 0);
  const canceledAmount = subscriptions.filter((s) => s.status === 'CANCELED').reduce((sum, s) => sum + s.amount, 0);
  const totalInvoiced = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const paidRatio = paidAmount + outstanding > 0 ? paidAmount / (paidAmount + outstanding) : null;
  // Approximation: no paid-date is tracked, so this is time-since-created for currently-active rows.
  const avgResolutionDays = avgDays(
    subscriptions.filter((s) => s.status === 'ACTIVE').map((s) => ({ start: s.createdAt, end: s.updatedAt }))
  );

  // Tasks — no completedAt field; DONE + updatedAt stands in for completion.
  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  const totalCreated = tasks.length;
  const totalCompleted = doneTasks.length;
  const completionRate = totalCreated > 0 ? totalCompleted / totalCreated : null;
  const avgTurnaroundDays = avgDays(doneTasks.map((t) => ({ start: t.createdAt, end: t.updatedAt })));

  const numBuckets = Math.ceil(windowDays / 7);
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);
  const weeks = Array.from({ length: numBuckets }, (_, i) => {
    const bucketStart = new Date(windowStart);
    bucketStart.setDate(bucketStart.getDate() + i * 7);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + 7);
    const completed = doneTasks.filter((t) => t.updatedAt >= bucketStart && t.updatedAt < bucketEnd).length;
    return { weekStart: bucketStart.toISOString().slice(0, 10), completed };
  });

  // Expenses & mileage
  const totalExpenses = expenses.filter((e) => e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
  const mileageRows = expenses.filter((e) => e.type === 'MILEAGE');
  const totalMileageCost = mileageRows.reduce((sum, e) => sum + e.amount, 0);
  const totalMiles = mileageRows.reduce((sum, e) => sum + (e.miles ?? 0), 0);

  return NextResponse.json({
    revenue: {
      totalInvoiced,
      outstanding,
      paidAmount,
      canceledAmount,
      paidRatio,
      avgResolutionDays,
      subscriptionCount: subscriptions.length,
    },
    tasks: {
      totalCreated,
      totalCompleted,
      completionRate,
      avgTurnaroundDays,
      velocity: { windowDays, weeks },
    },
    expenses: {
      totalExpenses,
      totalMileageCost,
      totalMiles,
    },
  });
}
