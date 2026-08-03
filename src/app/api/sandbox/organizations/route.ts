import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true, logoUrl: true, primaryColor: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(organizations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
