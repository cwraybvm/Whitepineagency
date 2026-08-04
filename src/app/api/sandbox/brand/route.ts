import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, brandVoice: true, brandGuidelines: true },
    });
    return NextResponse.json(org || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId, brandVoice, brandGuidelines, primaryColor } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        brandVoice,
        brandGuidelines,
        ...(primaryColor !== undefined ? { primaryColor } : {}),
      },
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save brand DNA' }, { status: 500 });
  }
}
