import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// ✉️ POST: generic transactional email sender via Resend, shared by the
// BVM Quick Email dispatcher and any other 1-click email action.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { to, subject, body } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'White Pine BVM <bvm@yourdomain.com>',
        to: [to],
        subject,
        text: body,
      }),
    });

    if (!resendResponse.ok) {
      const errLog = await resendResponse.json();
      throw new Error(JSON.stringify(errLog));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email send failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
