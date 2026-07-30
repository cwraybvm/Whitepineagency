import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;
  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });

  const domain = org?.domain || 'example.com';
  const keyword = org?.primaryKeyword || 'local services near me';
  const origin = new URL(request.url).origin;

  const [rankRes, speedRes] = await Promise.all([
    fetch(`${origin}/api/audit/rank?domain=${encodeURIComponent(domain)}&keyword=${encodeURIComponent(keyword)}`, { cache: 'no-store' }),
    fetch(`${origin}/api/audit/speed?url=${encodeURIComponent(domain)}`, { cache: 'no-store' }),
  ]);

  const rankData = rankRes.ok ? await rankRes.json() : null;
  const speedData = speedRes.ok ? await speedRes.json() : null;

  return NextResponse.json(
    {
      domain,
      keyword,
      rank: rankData?.rank ?? null,
      competitors: rankData?.competitors ?? [],
      estimationMode: rankData?.estimationMode ?? true,
      speedScore: speedData?.score ?? null,
      lcp: speedData?.lcp ?? null,
      speedStatus: speedData?.status ?? null,
      isRealSpeedData: speedData?.isRealGoogleData ?? false,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
