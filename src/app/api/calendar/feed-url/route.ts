import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Not covered by proxy.ts's matcher, so the check lives here.
async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.CALENDAR_FEED_TOKEN;
  if (!token) {
    return NextResponse.json({ configured: false, url: null });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ configured: true, url: `${origin}/api/calendar/feed/${token}` });
}
