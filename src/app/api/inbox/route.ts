import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const messages = await prisma.inboxMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(messages);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch inbox messages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId = 'default-org', senderName, senderContact, channel, body } = await req.json();

    if (!senderContact || !body) {
      return NextResponse.json({ error: 'senderContact and body are required' }, { status: 400 });
    }

    const message = await prisma.inboxMessage.create({
      data: {
        organizationId,
        senderName: senderName || 'Anonymous',
        senderContact,
        channel: channel || 'SMS',
        body,
      },
    });

    return NextResponse.json(message);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to log incoming message' }, { status: 500 });
  }
}