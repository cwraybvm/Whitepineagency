import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { formatTimestamp } from '@/lib/timestamp';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// ✅ POST: mark a client dropped off -- sets stage to "Magazine Dropped",
// bumps lastContacted (a drop-off is a contact event -- this is what makes
// the 30-day cold-account calc actually reflect completed drop-offs), and
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

    const now = new Date();
    const note = `[Drop-Off Completed: ${formatTimestamp(now)}]`;
    const contactNotes = existing.contactNotes ? `${existing.contactNotes}\n${note}` : note;

    const client = await prisma.bvmClientKanban.update({
      where: { id: clientId },
      data: { stage: 'Magazine Dropped', contactNotes, lastContacted: now },
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('Mark dropped-off failed:', error);
    return NextResponse.json({ error: 'Failed to mark dropped off' }, { status: 500 });
  }
}
