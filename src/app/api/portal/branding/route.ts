import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

async function requireOrgId() {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) return null;
  return resolveOrganizationId(orgIdCookie);
}

export async function GET() {
  const organizationId = await requireOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, logoUrl: true, primaryColor: true, customDomain: true },
  });

  return NextResponse.json(org || {}, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const organizationId = await requireOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  try {
    const { logoUrl, primaryColor, customDomain } = await request.json();

    if (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor)) {
      return NextResponse.json({ error: 'primaryColor must be a hex value like #2563EB' }, { status: 400 });
    }
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      return NextResponse.json({ error: 'logoUrl must be a valid http(s) URL' }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        customDomain: customDomain || null,
      },
      select: { name: true, logoUrl: true, primaryColor: true, customDomain: true },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error('Branding update failed:', error);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
