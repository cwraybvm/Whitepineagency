import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  // 🔐 1. SECURE ADMIN & PORTAL ROUTES
  if (pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.startsWith('/fulfillment')) {
    const authToken = request.cookies.get('auth_token')?.value;
    const isAuthenticated = Boolean(authToken && authToken.trim().length > 0);

    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      const safeCallbackPath = pathname.startsWith('/') ? pathname : '/login';
      loginUrl.searchParams.set('callbackUrl', safeCallbackPath);
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
    '/api/analytics/:path*',
    '/api/leads/:path*'
  ],
};