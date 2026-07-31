import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Default to a realistic demo client ID or custom parameter
  const demoOrgId = searchParams.get('orgId') || 'demo-apex-plumbing';
  
  // Construct redirect URL to the portal page
  const portalUrl = new URL('/portal', request.url);
  portalUrl.searchParams.set('demo', 'true');

  const response = NextResponse.redirect(portalUrl);

  // Set cookies so middleware recognizes auth & isolates tenant. This is a
  // magic-link preview for prospects — scope it to CLIENT_OWNER (portal
  // access only). It used to grant a bare auth_token with no role, which
  // under the old auth_token-presence-only checks also happened to unlock
  // /admin, /fulfillment, and /crm — a real over-permission this role fixes.
  response.cookies.set('auth_token', 'demo-session-token', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set('role', 'CLIENT_OWNER', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set('org_id', demoOrgId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}