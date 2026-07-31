import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { clientId } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: clientId },
      include: {
        portalLeads: { select: { id: true } },
        subscriptions: { select: { status: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: org.id,
        name: org.name,
        leadsCount: org.portalLeads.length,
        // No Google Business Profile integration yet — no real rating source
        // exists in the schema. Static placeholder until that's wired up.
        rating: 4.9,
        retainerActive: org.subscriptions.some((s) => s.status === 'ACTIVE'),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Shadow portal query failed:', error);
    return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
  }
}
