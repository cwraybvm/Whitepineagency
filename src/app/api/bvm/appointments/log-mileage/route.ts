import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { IRS_MILEAGE_RATE } from '@/lib/bvmTargets';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 💰 POST: log a mileage expense for a BVM appointment. organizationId is
// intentionally null -- this is White Pine's own internal deduction, not
// billable to any agency client's Organization.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { appointmentId, clientName, miles, date } = await request.json();

    if (!appointmentId || !clientName || typeof miles !== 'number' || miles <= 0) {
      return NextResponse.json({ error: 'Missing appointmentId, clientName, or miles' }, { status: 400 });
    }

    const amount = Math.round(miles * IRS_MILEAGE_RATE * 100) / 100;

    const expense = await prisma.expense.create({
      data: {
        organizationId: null,
        type: 'MILEAGE',
        category: 'Business Mileage',
        description: clientName,
        appointmentId,
        miles,
        amount,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error('Log mileage expense failed:', error);
    return NextResponse.json({ error: 'Failed to log mileage expense' }, { status: 500 });
  }
}
