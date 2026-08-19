import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📅 GET: fetch a day's conference call entry, or recent entries when no date given
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (date) {
    const call = await prisma.bvmConferenceCall.findUnique({ where: { date } });
    return NextResponse.json(
      call || {
        id: null,
        date,
        attended: false,
        notes: '',
        callType: 'Custom',
        keyTakeaways: '',
        objectionScripts: '',
        actionItems: '',
      }
    );
  }

  const calls = await prisma.bvmConferenceCall.findMany({ orderBy: { date: 'desc' }, take: 30 });
  return NextResponse.json(calls);
}

// 💾 PUT: upsert a day's conference call entry
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date, attended, notes, callType, keyTakeaways, objectionScripts, actionItems } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    const shared = {
      attended: Boolean(attended),
      notes: notes || '',
      callType: callType || 'Custom',
      keyTakeaways: keyTakeaways || '',
      objectionScripts: objectionScripts || '',
      actionItems: actionItems || '',
    };

    const call = await prisma.bvmConferenceCall.upsert({
      where: { date },
      create: { date, ...shared },
      update: shared,
    });

    return NextResponse.json({ success: true, call });
  } catch (error) {
    console.error('BVM conference PUT failed:', error);
    return NextResponse.json({ error: 'Failed to save conference call' }, { status: 500 });
  }
}
