import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

// Force route to execute dynamically at runtime instead of during static build analysis
export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

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

// 📖 GET: Chat history for a lead (CRM SMS drawer)
export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');

  if (!leadId) {
    return NextResponse.json({ error: 'Missing leadId parameter' }, { status: 400 });
  }

  try {
    const messages = await prisma.leadMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Lead message history query failed:', error);
    return NextResponse.json({ error: 'Failed to load message history' }, { status: 500 });
  }
}

// 📤 POST: Outbound SMS from Portal/CRM — sends via Twilio, then (if leadId
// is given) persists it to that lead's thread for the chat drawer.
export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { to, message, leadId } = await req.json();

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

    let savedMessage = null;
    if (leadId) {
      try {
        savedMessage = await prisma.leadMessage.create({
          data: {
            leadId,
            direction: 'outbound',
            body: message,
            fromNumber: process.env.TWILIO_PHONE_NUMBER,
            toNumber: to,
            twilioSid: res.sid,
          },
        });
      } catch (dbError) {
        // The SMS already sent — a history-persistence failure shouldn't look
        // like a failed send to the operator.
        console.error('Failed to persist outbound lead message (SMS still sent):', dbError);
      }
    }

    return NextResponse.json({ success: true, sid: res.sid, message: savedMessage });
  } catch (error: any) {
    console.error('Twilio Outbound Error:', error);
    return NextResponse.json(
      { error: error.message || 'Twilio API Error' },
      { status: 500 }
    );
  }
}

// 📥 PUT Webhook: Inbound Twilio Webhook Receiver — logs the message against
// whichever Lead has a matching phone number, so it shows up in the drawer.
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From')?.toString();
    const toPhone = formData.get('To')?.toString();
    const messageBody = formData.get('Body')?.toString();

    console.log(`[Twilio Webhook] Received SMS from ${fromPhone}: ${messageBody}`);

    if (fromPhone && messageBody) {
      try {
        const lead = await prisma.lead.findFirst({ where: { phone: fromPhone } });
        if (lead) {
          await prisma.leadMessage.create({
            data: {
              leadId: lead.id,
              direction: 'inbound',
              body: messageBody,
              fromNumber: fromPhone,
              toNumber: toPhone,
            },
          });
        }
      } catch (dbError) {
        console.error('Failed to persist inbound lead message:', dbError);
      }
    }

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