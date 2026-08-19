import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here.
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

// Client list is read by staff across /admin, /fulfillment (OPERATOR), and
// /crm (SALES) — not just OWNER-gated /admin pages — so GET only excludes
// unauthenticated/client-portal roles. Mirrors proxy.ts's route matrix.
async function requireStaff() {
  const store = await cookies();
  const role = store.get('role')?.value;
  return role === 'OWNER' || role === 'OPERATOR' || role === 'SALES';
}

export async function GET() {
  // Never throw here — every caller (client selector, billing timer widget,
  // clients page) treats a non-array response as "failed to load clients".
  if (!(await requireStaff())) {
    return NextResponse.json([]);
  }

  try {
    const clients = await prisma.organization.findMany({
      select: { id: true, name: true, status: true, slug: true, primaryColor: true, disabledFeatures: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(clients);
  } catch (err) {
    console.error('GET /api/clients failed:', err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, slug, status, disabledFeatures } = await req.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const client = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        status: status || 'ACTIVE',
        disabledFeatures: Array.isArray(disabledFeatures) ? disabledFeatures : [],
      },
      select: { id: true, name: true, status: true, slug: true, primaryColor: true, disabledFeatures: true },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 });
    }
    console.error('POST /api/clients failed:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
