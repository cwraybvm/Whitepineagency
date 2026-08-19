import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { buildIcsCalendar } from '@/lib/ics';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// ✉️ POST: build a .ics invite for an appointment and email it to clientEmail via Resend
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    const appointment = await prisma.bvmAppointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    if (!appointment.clientEmail) {
      return NextResponse.json({ error: 'Appointment has no client email on file' }, { status: 400 });
    }

    const start = new Date(appointment.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = buildIcsCalendar(
      [
        {
          uid: `bvm-appt-${appointment.id}@whitepine`,
          title: `BVM Appointment — ${appointment.clientName}`,
          description: appointment.notes || undefined,
          start,
          end,
        },
      ],
      'BVM Appointments'
    );

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'White Pine BVM <bvm@yourdomain.com>',
        to: [appointment.clientEmail],
        subject: `Appointment Confirmed — ${start.toLocaleDateString()} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        text: `Hi ${appointment.clientName},\n\nThis confirms your appointment on ${start.toLocaleString()}. A calendar invite is attached.\n\n— White Pine BVM`,
        attachments: [
          {
            filename: 'appointment.ics',
            content: Buffer.from(ics).toString('base64'),
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errLog = await resendResponse.json();
      throw new Error(JSON.stringify(errLog));
    }

    await prisma.bvmAppointment.update({ where: { id }, data: { inviteSentAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('BVM appointment invite send failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to send invite' }, { status: 500 });
  }
}
