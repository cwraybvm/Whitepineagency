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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Malformed/empty/non-JSON body — a client-input problem, not a server
    // fault. Reported separately from the try below so it doesn't fall into
    // the generic 500 path (this was the actual cause of "Internal System
    // Error" reports: any truncated or malformed request here previously
    // hit the catch-all and returned an unhelpful 500).
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  try {
    const { email, password } = body as { email?: string; password?: string };

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

    // 2. Record login recency for the revenue/health radar. Best-effort: a
    // transient failure on this audit-only write must not fail an otherwise
    // valid login.
    try {
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    } catch (err) {
      console.error('[AUTH_LOGIN_ERROR] lastLoginAt update failed (non-fatal)', err);
    }

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
  } catch (err) {
    // Never leak err.message or a stack trace to the client — could expose
    // DB/query details. Log server-side for diagnosis instead.
    console.error('[AUTH_LOGIN_ERROR]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
