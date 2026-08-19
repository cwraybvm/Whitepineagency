import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: list all kanban clients
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await prisma.bvmClientKanban.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(clients);
}

// ➕ POST: create a new kanban client card
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientName, stage } = await request.json();

    if (!clientName) {
      return NextResponse.json({ error: 'Missing client name' }, { status: 400 });
    }

    const client = await prisma.bvmClientKanban.create({
      data: { clientName, stage: stage || 'Lead' },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error) {
    console.error('BVM client POST failed:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

// 🔄 PATCH: update stage / contact tracking / notes (e.g. drag between kanban columns)
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, stage, lastContacted, nextContacted, contactNotes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (stage !== undefined) data.stage = stage;
    if (lastContacted !== undefined) data.lastContacted = lastContacted ? new Date(lastContacted) : null;
    if (nextContacted !== undefined) data.nextContacted = nextContacted ? new Date(nextContacted) : null;
    if (contactNotes !== undefined) data.contactNotes = contactNotes;

    const client = await prisma.bvmClientKanban.update({ where: { id }, data });
    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('BVM client PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
