import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

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
      const response = NextResponse.json({ success: true, role: 'ADMIN' });
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('auth_token', 'master_bypass_active_session', {
        path: '/',
        maxAge: 86400,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
      });
      response.cookies.set('org_id', 'default-tenant-workspace', {
        path: '/',
        maxAge: 86400,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
      });
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

    // 3. Set up the payload and drop cookies dynamically based on security permissions
    const response = NextResponse.json({ success: true, role: user.role });
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Core user identifier session
    response.cookies.set('user_session', user.id, {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    // 🏎️ Core multi-tenant workspace context isolation cookie
    response.cookies.set('org_id', primaryMembership.organizationId, {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    // 🔐 SECURE ADMIN GATEWAY ACCESS OVERLAY
    // If the database profile user role registers as an admin, grant the strict middleware token
    if (user.role === 'ADMIN' || user.role === 'admin' || user.role === 'AGENCY_ADMIN') {
      response.cookies.set('auth_token', `session_active_token_wp_${user.id}`, {
        path: '/',
        maxAge: 86400, // 24 hour lifespan
        httpOnly: true, // Safeguards against cross-site scripting cookie manipulation
        secure: isProduction,
        sameSite: 'strict',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Auth API Failure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}