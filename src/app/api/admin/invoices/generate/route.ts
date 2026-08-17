import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_HOURLY_RATE = 150;

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

async function findBillableEntries(organizationId: string, startDate: string | null, endDate: string | null) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { hourlyRate: true },
  });
  if (!organization) return null;

  const entries = await prisma.timeEntry.findMany({
    where: {
      organizationId,
      isBilled: false,
      endTime: { not: null },
      ...(startDate ? { startTime: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { startTime: { lte: new Date(endDate) } } : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  const rate = organization.hourlyRate ?? DEFAULT_HOURLY_RATE;
  const lines = entries.map((entry) => {
    const hours = Math.round((entry.durationSeconds / 3600) * 100) / 100;
    return {
      timeEntryId: entry.id,
      description: entry.description || 'Time entry',
      hours,
      rate,
      amount: Math.round(hours * rate * 100) / 100,
    };
  });
  const totalHours = Math.round(lines.reduce((sum, l) => sum + l.hours, 0) * 100) / 100;
  const totalAmount = Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;

  return { entries, rate, lines, totalHours, totalAmount };
}

// Read-only preview of what POST would bill — same filters, no mutation.
export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const billable = await findBillableEntries(organizationId, searchParams.get('startDate'), searchParams.get('endDate'));
  if (!billable) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const { rate, totalHours, totalAmount, lines } = billable;
  return NextResponse.json({ rate, totalHours, totalAmount, lines });
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { organizationId, startDate, endDate } = await req.json();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const billable = await findBillableEntries(organizationId, startDate ?? null, endDate ?? null);
  if (!billable) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const { entries, rate, lines, totalHours, totalAmount } = billable;
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No unbilled time entries found for this client' }, { status: 400 });
  }

  const periodStart = entries[0].startTime;
  const periodEnd = entries[entries.length - 1].startTime;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        organizationId,
        status: 'DRAFT',
        periodStart,
        periodEnd,
        hourlyRate: rate,
        totalHours,
        totalAmount,
        lines: { create: lines },
      },
      include: { lines: true },
    });

    await tx.timeEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { isBilled: true },
    });

    return created;
  });

  return NextResponse.json(invoice, { status: 201 });
}
