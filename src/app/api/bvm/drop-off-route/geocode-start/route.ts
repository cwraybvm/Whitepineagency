import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📍 POST: geocode the free-text starting location (not cached — changes per session)
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { address } = await request.json();
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const geo = await geocodeAddress(address);
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode address' }, { status: 422 });
  }

  return NextResponse.json(geo);
}
