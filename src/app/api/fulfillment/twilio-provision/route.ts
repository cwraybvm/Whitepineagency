import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !accountSid.startsWith('AC')) {
    throw new Error('Invalid or missing TWILIO_ACCOUNT_SID in environment variables. Must start with "AC".');
  }
  if (!authToken) {
    throw new Error('Missing TWILIO_AUTH_TOKEN in environment variables.');
  }
  return twilio(accountSid, authToken);
}

// 📞 POST: search + purchase a Twilio local number in the given area code,
// then attach it to the task's linked Organization.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId, areaCode } = await request.json();

    if (!taskId || !/^\d{3}$/.test(areaCode || '')) {
      return NextResponse.json({ error: 'taskId and a 3-digit areaCode are required' }, { status: 400 });
    }

    const task = await prisma.fulfillmentTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (!task.organizationId) {
      return NextResponse.json({ error: 'Task has no linked organization to attach a number to' }, { status: 400 });
    }

    const client = getTwilioClient();

    const candidates = await client.availablePhoneNumbers('US').local.list({
      areaCode: Number(areaCode),
      limit: 1,
    });
    const candidate = candidates[0];
    if (!candidate) {
      return NextResponse.json({ error: `No available numbers found in area code ${areaCode}` }, { status: 404 });
    }

    const purchased = await client.incomingPhoneNumbers.create({ phoneNumber: candidate.phoneNumber });

    const organization = await prisma.organization.update({
      where: { id: task.organizationId },
      data: { twilioPhoneNumber: purchased.phoneNumber },
    });

    return NextResponse.json({ success: true, phoneNumber: purchased.phoneNumber, organizationId: organization.id });
  } catch (error: any) {
    console.error('Twilio provisioning failed:', error);
    return NextResponse.json({ error: error.message || 'Twilio provisioning failed' }, { status: 500 });
  }
}
