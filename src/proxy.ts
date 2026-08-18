import { NextResponse, NextRequest } from 'next/server';

type Role = 'OWNER' | 'OPERATOR' | 'SALES' | 'CLIENT_OWNER' | 'CLIENT_MEMBER';

// RBAC route matrix. /demo/* is deliberately NOT here — it stays public on
// purpose so a rep can hand a screen straight to a prospect with no login
// (see DEMO_PLAYBOOK.md). Checked in order; first match wins.
const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['OWNER'] },
  { prefix: '/fulfillment', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/sandbox', roles: ['OWNER', 'OPERATOR'] },
  { prefix: '/crm', roles: ['OWNER', 'OPERATOR', 'SALES'] },
  { prefix: '/portal/settings', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER'] },
  { prefix: '/portal', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER', 'CLIENT_MEMBER'] },
  { prefix: '/dashboard', roles: ['OWNER', 'OPERATOR', 'CLIENT_OWNER', 'CLIENT_MEMBER'] },
];

function allowedRolesFor(pathname: string): Role[] | null {
  const match = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  return match ? match.roles : null;
}

// Root app domain — a request host matching this (or a `<slug>.` subdomain of
// it) resolves to a tenant by slug; anything else is treated as a client's
// own custom domain (e.g. portal.apexplumbing.com) mapped via Organization.customDomain.
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'whitepine.portal';

function resolveTenantFromHost(host: string | null): { tenantSlug?: string; tenantDomain?: string } {
  if (!host) return {};
  const hostname = host.split(':')[0].toLowerCase();

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}` || hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
    return {};
  }
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return { tenantSlug: hostname.slice(0, -(ROOT_DOMAIN.length + 1)) };
  }
  return { tenantDomain: hostname };
}

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

  // 🌐 0. EDGE TENANT RESOLUTION — subdomain/custom-domain -> x-tenant-* headers
  // for downstream API routes and Server Components (see TenantTheme).
  const { tenantSlug, tenantDomain } = resolveTenantFromHost(request.headers.get('host'));
  const tenantHeaders = new Headers(request.headers);
  tenantHeaders.delete('x-tenant-slug');
  tenantHeaders.delete('x-tenant-domain');
  if (tenantSlug) tenantHeaders.set('x-tenant-slug', tenantSlug);
  if (tenantDomain) tenantHeaders.set('x-tenant-domain', tenantDomain);

  // 🔐 1. RBAC — AUTHENTICATION + ROLE FOR ADMIN/FULFILLMENT/CRM/PORTAL
  const allowedRoles = allowedRolesFor(pathname);
  if (allowedRoles) {
    const authToken = request.cookies.get('auth_token')?.value;
    const userSession = request.cookies.get('user_session')?.value;
    const role = request.cookies.get('role')?.value as Role | undefined;
    const isAuthenticated = Boolean(authToken?.trim() || userSession?.trim());

    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated but no role cookie (pre-RBAC session) or wrong tier for
    // this route: send to /login for the missing-role case (a fresh login
    // issues a role cookie) and to /access-denied for a real mismatch, so
    // an authenticated user sees *why* rather than bouncing in a loop.
    if (!role) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!allowedRoles.includes(role)) {
      const deniedUrl = new URL('/access-denied', request.url);
      deniedUrl.searchParams.set('path', pathname);
      deniedUrl.searchParams.set('role', role);
      return NextResponse.redirect(deniedUrl);
    }
  }

  // 📡 2. TENANT CONTEXT INJECTION FOR APIS & PORTAL
  if (
    pathname.startsWith('/api/analytics') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/portal') ||
    pathname.startsWith('/portal')
  ) {
    const organizationId =
      request.headers.get('x-organization-id') ||
      request.cookies.get('org_id')?.value ||
      url.searchParams.get('orgId') ||
      'default-tenant-workspace';

    tenantHeaders.set('x-organization-id', organizationId);
  }

  return NextResponse.next({
    request: {
      headers: tenantHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/portal/:path*',
    '/dashboard/:path*',
    '/fulfillment/:path*',
    '/sandbox/:path*',
    '/crm/:path*',
    '/api/analytics/:path*',
    '/api/leads/:path*',
    '/api/portal/:path*'
  ],
};
