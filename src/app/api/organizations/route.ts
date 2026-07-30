import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ✅ SHARED INSTANCE

// ⚡ Force dynamic execution at request time (prevents static build-time DB evaluation)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const {
      organizationId,
      mailchimpApiKey,
      mailchimpListId,
      wordpressUrl,
      wordpressUsername,
      wordpressAppPass,
    } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mailchimpApiKey,
        mailchimpListId,
        wordpressUrl,
        wordpressUsername,
        wordpressAppPass,
      },
    });

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update credentials' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        mailchimpApiKey: true,
        mailchimpListId: true,
        wordpressUrl: true,
        wordpressUsername: true,
        wordpressAppPass: true,
      },
    });

    return NextResponse.json(org || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}