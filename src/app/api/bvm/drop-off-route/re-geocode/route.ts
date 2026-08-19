import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 🔄 POST: force re-geocode every saved address (ignores existing cached
// lat/lng -- that's the point of a manual re-run), via the dual Google ->
// Nominatim fallback in geocodeAddress.
export async function POST() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await prisma.bvmAddress.findMany();

  let succeeded = 0;
  for (const address of addresses) {
    const query = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
    const geo = await geocodeAddress(query);
    if (geo) {
      await prisma.bvmAddress.update({ where: { id: address.id }, data: { lat: geo.lat, lng: geo.lng } });
      succeeded++;
    }
  }

  return NextResponse.json({ total: addresses.length, succeeded, failed: addresses.length - succeeded });
}
