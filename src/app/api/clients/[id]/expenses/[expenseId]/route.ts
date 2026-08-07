import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { expenseId } = await params;
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ success: true });
}
