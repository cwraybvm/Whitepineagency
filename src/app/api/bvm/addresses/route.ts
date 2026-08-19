import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: list all new addresses, most recent first
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await prisma.bvmAddress.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(addresses);
}

// ➕ POST: create a new address entry
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerName, street, city, state, zip, phone, publicationName, magazineZone } = body;

    if (!customerName || !street || !city || !state || !zip) {
      return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
    }

    const address = await prisma.bvmAddress.create({
      data: { customerName, street, city, state, zip, phone, publicationName, magazineZone },
    });

    return NextResponse.json({ success: true, address }, { status: 201 });
  } catch (error) {
    console.error('BVM address POST failed:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

// 🔄 PATCH: toggle "Sent to BVM" status
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, sentToBvm } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing address ID' }, { status: 400 });
    }

    const address = await prisma.bvmAddress.update({
      where: { id },
      data: { sentToBvm: Boolean(sentToBvm) },
    });

    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error('BVM address PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}
