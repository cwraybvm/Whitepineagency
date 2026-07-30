import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Force route to execute dynamically at runtime instead of during static build analysis
export const dynamic = 'force-dynamic';

// Lazy-load Twilio client inside request handlers
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !accountSid.startsWith('AC')) {
    throw new Error(
      'Invalid or missing TWILIO_ACCOUNT_SID in environment variables. Must start with "AC".'
    );
  }

  if (!authToken) {
    throw new Error('Missing TWILIO_AUTH_TOKEN in environment variables.');
  }

  return twilio(accountSid, authToken);
}

// 📤 POST: Outbound SMS from Portal
export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters: "to" or "message"' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();

    const res = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    return NextResponse.json({ success: true, sid: res.sid });
  } catch (error: any) {
    console.error('Twilio Outbound Error:', error);
    return NextResponse.json(
      { error: error.message || 'Twilio API Error' },
      { status: 500 }
    );
  }
}

// 📥 PUT Webhook: Inbound Twilio Webhook Receiver
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From')?.toString();
    const messageBody = formData.get('Body')?.toString();

    console.log(`[Twilio Webhook] Received SMS from ${fromPhone}: ${messageBody}`);

    // Standard Twilio TwiML response to prevent sending duplicate replies
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (err: any) {
    console.error('Twilio Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}