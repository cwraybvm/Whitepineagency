import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📥 POST: atomically mark all unsent addresses as "Sent to BVM" and return
// them, so the client can build the upload CSV from exactly what was marked.
export async function POST() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const unsent = await prisma.bvmAddress.findMany({ where: { sentToBvm: false }, orderBy: { createdAt: 'asc' } });

    if (unsent.length === 0) {
      return NextResponse.json({ addresses: [] });
    }

    await prisma.bvmAddress.updateMany({
      where: { id: { in: unsent.map((a) => a.id) } },
      data: { sentToBvm: true },
    });

    return NextResponse.json({ addresses: unsent });
  } catch (error) {
    console.error('BVM address export failed:', error);
    return NextResponse.json({ error: 'Failed to export addresses' }, { status: 500 });
  }
}
