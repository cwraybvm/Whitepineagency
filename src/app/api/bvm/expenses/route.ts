import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: BVM's own expense log (both direct expenses and mileage) --
// scoped to organizationId: null so it never mixes with an agency client's
// billable expenses under /admin/clients/[id] (a separate, Organization-
// scoped system).
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expenses = await prisma.expense.findMany({
    where: { organizationId: null },
    include: { appointment: { select: { clientName: true, date: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(expenses);
}

// ➕ POST: log a direct (non-mileage) business expense
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date, category, description, amount, receiptUrl } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Missing or invalid amount' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        organizationId: null,
        type: 'EXPENSE',
        category: category || 'General',
        description: description || null,
        amount: Number(amount),
        receiptUrl: receiptUrl || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error('BVM expense POST failed:', error);
    return NextResponse.json({ error: 'Failed to log expense' }, { status: 500 });
  }
}

// 🔄 PATCH: attach/update a receipt photo on an already-logged expense
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, receiptUrl } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    const expense = await prisma.expense.update({ where: { id }, data: { receiptUrl: receiptUrl || null } });
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('BVM expense PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
