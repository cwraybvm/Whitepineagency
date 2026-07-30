import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // 🛡️ Bypass Next.js internal build requests
  if (
    request.headers.get('x-nextjs-data') ||
    pathname.includes('/_next') ||
    request.headers.get('user-agent') === 'Next.js Static Worker'
  ) {
    return NextResponse.next();
  }

  // 🔐 1. SECURE ADMIN, FULFILLMENT & CRM ROUTES (staff-only, elevated session required)
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/fulfillment') ||
    pathname.startsWith('/crm')
  ) {
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken?.trim()) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🔐 1b. SECURE PORTAL ROUTES (any authenticated user — client or staff)
  if (pathname.startsWith('/portal')) {
    // auth_token = elevated/staff session. user_session = any DB-authenticated
    // login (client or staff) — set on every successful /api/auth/login call.
    const authToken = request.cookies.get('auth_token')?.value;
    const userSession = request.cookies.get('user_session')?.value;
    const isAuthenticated = Boolean(authToken?.trim() || userSession?.trim());

    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 📡 2. TENANT CONTEXT INJECTION FOR APIS & PORTAL
  if (
    pathname.startsWith('/api/analytics') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/portal')
  ) {
    const organizationId =
      request.headers.get('x-organization-id') ||
      request.cookies.get('org_id')?.value ||
      url.searchParams.get('orgId') ||
      'default-tenant-workspace';

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-organization-id', organizationId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/portal/:path*',
    '/fulfillment/:path*',
    '/crm/:path*',
    '/api/analytics/:path*',
    '/api/leads/:path*'
  ],
};
