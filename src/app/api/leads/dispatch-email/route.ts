import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { to, subject, body } = await request.json();

    if (!to || !body) {
      return NextResponse.json({ error: 'Missing transit variables' }, { status: 400 });
    }

    // 🚀 Transmit request payload straight to the Resend API matrix
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'White Pine Risk Engine <audits@yourdomain.com>',
        to: [to],
        subject: subject || 'Commercial Infrastructure Alert Profiling',
        text: body,
      }),
    });

    if (!resendResponse.ok) {
      const errLog = await resendResponse.json();
      throw new Error(JSON.stringify(errLog));
    }

    return NextResponse.json({ success: true, message: 'Payload safely dispatched.' });
  } catch (error: any) {
    console.error('Email hub failure:', error);
    return NextResponse.json({ error: error.message || 'Transmission failed.' }, { status: 500 });
  }
}