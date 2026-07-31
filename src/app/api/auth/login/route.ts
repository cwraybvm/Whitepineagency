import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

function setSessionCookies(
  response: NextResponse,
  { userSessionId, orgId, role }: { userSessionId?: string; orgId: string; role: string }
) {
  const isProduction = process.env.NODE_ENV === 'production';
  const base = { path: '/', maxAge: 86400, httpOnly: true, secure: isProduction, sameSite: 'strict' as const };

  if (userSessionId) response.cookies.set('user_session', userSessionId, base);
  response.cookies.set('org_id', orgId, base);
  // RBAC tier read by proxy.ts to authorize /admin, /fulfillment, /crm, /portal.
  response.cookies.set('role', role, base);
  // Legacy "is authenticated at all" marker — kept for anything still reading
  // it, but authorization decisions now go through the role cookie above.
  response.cookies.set('auth_token', userSessionId ? `session_active_token_wp_${userSessionId}` : 'master_bypass_active_session', base);
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 0. Master admin bypass — checked server-side only, so the password never
    // ships in client JS. ADMIN_PASSWORD was already declared in .env.local but
    // never actually read; this wires it up. Unset disables the bypass entirely.
    const bypassPassword = process.env.ADMIN_PASSWORD;
    if (bypassPassword && password === bypassPassword) {
      const response = NextResponse.json({ success: true, role: 'OWNER' });
      setSessionCookies(response, { orgId: 'default-tenant-workspace', role: 'OWNER' });
      return response;
    }

    if (!email) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 1. Locate the user AND include their workspace memberships
    const user = await db.user.findUnique({
      where: { email: email.trim() },
      include: {
        members: true, // 🛡️ Pulls in multi-tenant organization context
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Clear-text check matching your current schema parameters
    if (user.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Record login recency for the revenue/health radar, then identify
    // their primary workspace context
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const primaryMembership = user.members[0];
    if (!primaryMembership) {
      return NextResponse.json({ error: 'No active workspace membership found' }, { status: 403 });
    }

    // 3. Set up the payload and drop cookies — role drives route authorization
    const response = NextResponse.json({ success: true, role: user.role });
    setSessionCookies(response, {
      userSessionId: user.id,
      orgId: primaryMembership.organizationId,
      role: user.role,
    });

    return response;
  } catch (error: any) {
    console.error('Auth API Failure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
