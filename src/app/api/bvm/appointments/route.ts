import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📅 GET: list appointments, optionally scoped to a ?month=YYYY-MM
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  let where = {};
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where = { date: { gte: start, lt: end } };
  }

  const appointments = await prisma.bvmAppointment.findMany({ where, orderBy: { date: 'asc' } });
  return NextResponse.json(appointments);
}

// ➕ POST: create an appointment
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, clientName, outcome, notes, followUp, syncToCalendar } = body;

    if (!date || !clientName) {
      return NextResponse.json({ error: 'Missing date or client name' }, { status: 400 });
    }

    const appointment = await prisma.bvmAppointment.create({
      data: {
        date: new Date(date),
        clientName,
        outcome: outcome || '',
        notes: notes || '',
        followUp: followUp || '',
        syncToCalendar: Boolean(syncToCalendar),
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error('BVM appointment POST failed:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
