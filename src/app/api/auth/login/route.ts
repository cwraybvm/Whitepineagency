import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
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

    // 2. Identify their primary workspace context
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
    if (user.role === 'ADMIN' || user.role === 'admin') {
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