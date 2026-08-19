import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: clients with a linked address, geocoding+caching any that are missing lat/lng
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await prisma.bvmClientKanban.findMany({
    where: { addressId: { not: null } },
    include: { address: true },
    orderBy: { clientName: 'asc' },
  });

  // ponytail: sequential geocode-and-cache loop, fine for the expected volume
  // (dozens of stops). Parallelize with a concurrency cap if this list grows
  // into the hundreds and cold-starts start feeling slow.
  const stops = [];
  for (const c of clients) {
    if (!c.address) continue;
    let { lat, lng } = c.address;
    if (lat == null || lng == null) {
      const query = `${c.address.street}, ${c.address.city}, ${c.address.state} ${c.address.zip}`;
      const geo = await geocodeAddress(query);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        await prisma.bvmAddress.update({ where: { id: c.address.id }, data: { lat, lng } });
      }
    }
    stops.push({
      id: c.id,
      businessName: c.clientName,
      contactName: c.contactName,
      address: `${c.address.street}, ${c.address.city}, ${c.address.state} ${c.address.zip}`,
      lat,
      lng,
    });
  }

  return NextResponse.json(stops);
}
