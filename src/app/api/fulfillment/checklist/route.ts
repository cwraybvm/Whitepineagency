import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 🔄 PUT: toggle (or explicitly set) a single checklist item's done state
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, done } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing checklist item ID' }, { status: 400 });
    }

    const item = await prisma.fulfillmentChecklistItem.update({
      where: { id },
      data: { done: Boolean(done) },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Fulfillment checklist PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}
