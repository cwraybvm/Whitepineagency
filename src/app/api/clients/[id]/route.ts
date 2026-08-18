import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { FEATURE_KEYS } from '@/config/tenantFeatures';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here (mirrors src/app/api/clients/route.ts).
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { disabledFeatures } = await req.json();

  if (
    !Array.isArray(disabledFeatures) ||
    !disabledFeatures.every((f): f is string => FEATURE_KEYS.includes(f))
  ) {
    return NextResponse.json({ error: 'disabledFeatures must be an array of valid feature keys' }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: { disabledFeatures },
    select: { id: true, disabledFeatures: true },
  });

  return NextResponse.json(updated);
}
