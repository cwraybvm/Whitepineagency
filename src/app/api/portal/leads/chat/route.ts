import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;

  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const body = await request.json();
  const { leadId, sender, text } = body;

  if (!leadId || !sender || !text) {
    return NextResponse.json({ error: 'Missing leadId, sender, or text' }, { status: 400 });
  }

  const message = await prisma.portalChatMessage.create({
    data: { leadId, sender, text },
  });

  await prisma.portalLead.update({
    where: { id: leadId },
    data: { unrepliedMinutes: 0 },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      sender: message.sender,
      text: message.text,
      timestamp: message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  });
}
