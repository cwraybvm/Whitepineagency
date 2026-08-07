import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const expenses = await prisma.expense.findMany({
    where: { organizationId: id },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { type, amount, miles, category, receiptUrl, date } = await req.json();

  if (!type || (type !== 'EXPENSE' && type !== 'MILEAGE')) {
    return NextResponse.json({ error: 'Type must be EXPENSE or MILEAGE' }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      organizationId: id,
      type,
      amount: amount ?? 0,
      miles: type === 'MILEAGE' ? miles ?? 0 : null,
      category: category || 'General',
      receiptUrl: receiptUrl || null,
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
