import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here (mirrors src/app/api/clients/route.ts).
// Vault is reachable from /admin (OWNER) and /fulfillment (OWNER, OPERATOR).
async function requireStaff() {
  const store = await cookies();
  const role = store.get('role')?.value;
  return role === 'OWNER' || role === 'OPERATOR';
}

const VAULT_FIELDS = {
  mailchimpApiKey: true,
  mailchimpListId: true,
  wordpressUrl: true,
  wordpressUsername: true,
  wordpressAppPass: true,
  webhookUrl: true,
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const client = await prisma.organization.findUnique({
    where: { id },
    select: VAULT_FIELDS,
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const {
    mailchimpApiKey,
    mailchimpListId,
    wordpressUrl,
    wordpressUsername,
    wordpressAppPass,
    webhookUrl,
  } = await req.json();

  try {
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        mailchimpApiKey,
        mailchimpListId,
        wordpressUrl,
        wordpressUsername,
        wordpressAppPass,
        webhookUrl,
      },
      select: VAULT_FIELDS,
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error('POST /api/clients/[id]/vault failed:', err);
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}
