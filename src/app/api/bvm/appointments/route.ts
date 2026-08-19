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
    const { date, clientName, clientEmail, outcome, notes, followUp, syncToCalendar, appointmentTime, address, startAddress } = body;

    if (!date || !clientName) {
      return NextResponse.json({ error: 'Missing date or client name' }, { status: 400 });
    }

    const appointment = await prisma.bvmAppointment.create({
      data: {
        date: new Date(date),
        clientName,
        clientEmail: clientEmail || null,
        outcome: outcome || '',
        notes: notes || '',
        followUp: followUp || '',
        syncToCalendar: Boolean(syncToCalendar),
        appointmentTime: appointmentTime || null,
        address: address || null,
        startAddress: startAddress || null,
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error('BVM appointment POST failed:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}

// 🔄 PATCH: edit an existing appointment (outcome, notes, follow-up, contact info)
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, date, clientName, clientEmail, outcome, notes, followUp, syncToCalendar, appointmentTime, address, startAddress } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (date !== undefined) data.date = new Date(date);
    if (clientName !== undefined) data.clientName = clientName;
    if (clientEmail !== undefined) data.clientEmail = clientEmail || null;
    if (outcome !== undefined) data.outcome = outcome;
    if (notes !== undefined) data.notes = notes;
    if (followUp !== undefined) data.followUp = followUp;
    if (syncToCalendar !== undefined) data.syncToCalendar = Boolean(syncToCalendar);
    if (appointmentTime !== undefined) data.appointmentTime = appointmentTime || null;
    if (address !== undefined) data.address = address || null;
    if (startAddress !== undefined) data.startAddress = startAddress || null;

    const appointment = await prisma.bvmAppointment.update({ where: { id }, data });
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('BVM appointment PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
