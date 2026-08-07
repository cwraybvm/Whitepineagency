import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clients = await prisma.organization.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clients);
}
