import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

function formatDropOffTimestamp(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} at ${timePart}`;
}

// ✅ POST: mark a client dropped off -- sets stage to "Magazine Dropped" and
// appends (not overwrites) a timestamped note to contactNotes.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const existing = await prisma.bvmClientKanban.findUnique({ where: { id: clientId } });
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const note = `[Drop-Off Completed: ${formatDropOffTimestamp(new Date())}]`;
    const contactNotes = existing.contactNotes ? `${existing.contactNotes}\n${note}` : note;

    const client = await prisma.bvmClientKanban.update({
      where: { id: clientId },
      data: { stage: 'Magazine Dropped', contactNotes },
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('Mark dropped-off failed:', error);
    return NextResponse.json({ error: 'Failed to mark dropped off' }, { status: 500 });
  }
}
