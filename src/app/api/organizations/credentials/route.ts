import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: organizationId },
          { slug: organizationId },
        ],
      },
      select: {
        id: true,
        name: true,
        mailchimpApiKey: true,
        mailchimpListId: true,
        wordpressUrl: true,
        wordpressUsername: true,
        wordpressAppPass: true,
        webhookUrl: true,
      },
    });

    return NextResponse.json(org || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const {
      organizationId,
      mailchimpApiKey,
      mailchimpListId,
      wordpressUrl,
      wordpressUsername,
      wordpressAppPass,
      webhookUrl,
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
        webhookUrl,
      },
    });

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update credentials' }, { status: 500 });
  }
}