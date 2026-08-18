import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';

function req(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(url, { headers });
}

// unauthenticated -> 302 to /login with callbackUrl preserving destination
const res1 = proxy(req('/dashboard/scheduler'));
console.assert(res1.status === 307 || res1.status === 302, 'expected redirect status, got ' + res1.status);
const loc1 = res1.headers.get('location') || '';
console.assert(loc1.includes('/login'), 'expected redirect to /login, got ' + loc1);
console.assert(loc1.includes('callbackUrl=%2Fdashboard%2Fscheduler'), 'expected callbackUrl to preserve destination, got ' + loc1);

// authenticated, wrong role -> /access-denied
const res2 = proxy(req('/dashboard/cmo-strategy', { user_session: 'u1', role: 'SALES' }));
const loc2 = res2.headers.get('location') || '';
console.assert(loc2.includes('/access-denied'), 'expected access-denied for wrong role, got ' + loc2);

// authenticated, correct role -> passes through (no redirect)
const res3 = proxy(req('/dashboard/cmo-strategy', { user_session: 'u1', role: 'CLIENT_OWNER' }));
console.assert(!res3.headers.get('location'), 'expected no redirect for authorized client, got ' + res3.headers.get('location'));

console.log('proxy /dashboard guard: OK');
