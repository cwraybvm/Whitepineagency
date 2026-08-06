import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';
import { FEATURE_KEYS } from '@/config/tenantFeatures';

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_PUT_ROLES = ['OWNER', 'OPERATOR', 'CLIENT_OWNER'];

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
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      customDomain: true,
      disabledFeatures: true,
    },
  });

  return NextResponse.json(org || {}, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const role = (await cookies()).get('role')?.value;
  if (!role || !ALLOWED_PUT_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const organizationId = await requireOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  try {
    const { logoUrl, primaryColor, accentColor, customDomain, disabledFeatures } = await request.json();

    if (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor)) {
      return NextResponse.json({ error: 'primaryColor must be a hex value like #2563EB' }, { status: 400 });
    }
    if (accentColor && !HEX_COLOR_PATTERN.test(accentColor)) {
      return NextResponse.json({ error: 'accentColor must be a hex value like #EA580C' }, { status: 400 });
    }
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      return NextResponse.json({ error: 'logoUrl must be a valid http(s) URL' }, { status: 400 });
    }

    const validatedDisabledFeatures = Array.isArray(disabledFeatures)
      ? disabledFeatures.filter((f): f is string => FEATURE_KEYS.includes(f))
      : [];

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        accentColor: accentColor || null,
        customDomain: customDomain || null,
        disabledFeatures: validatedDisabledFeatures,
      },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        disabledFeatures: true,
      },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error('Branding update failed:', error);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
