import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: BVM's own mileage expense log -- scoped to organizationId: null so
// it never mixes with an agency client's billable expenses under
// /admin/clients/[id] (a separate, Organization-scoped system).
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expenses = await prisma.expense.findMany({
    where: { type: 'MILEAGE', organizationId: null },
    include: { appointment: { select: { clientName: true, date: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(expenses);
}
