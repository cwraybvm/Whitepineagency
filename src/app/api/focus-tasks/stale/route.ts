import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { staleCutoffDate } from '@/lib/staleTasks';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      isParked: false,
      updatedAt: { lt: staleCutoffDate() },
    },
    orderBy: { updatedAt: 'asc' },
  });

  return NextResponse.json({ count: tasks.length, tasks });
}
