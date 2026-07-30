import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Default to a realistic demo client ID or custom parameter
  const demoOrgId = searchParams.get('orgId') || 'demo-apex-plumbing';
  
  // Construct redirect URL to the portal page
  const portalUrl = new URL('/portal', request.url);
  portalUrl.searchParams.set('demo', 'true');

  const response = NextResponse.redirect(portalUrl);

  // Set cookies so middleware recognizes auth & isolates tenant
  response.cookies.set('auth_token', 'demo-session-token', {
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