import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma'; // ✅ SHARED INSTANCE

// ⚡ Force dynamic execution at request time (prevents static build-time DB evaluation)
export const dynamic = 'force-dynamic';

// This route reads/writes third-party integration credentials (Mailchimp API
// key, WordPress app password) — must not be reachable without a session.
// Not covered by proxy.ts's matcher, so the check lives here instead.
async function requireAuth() {
  const store = await cookies();
  const isAuthenticated = Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
  return isAuthenticated;
}

export async function POST(req: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      organizationId,
      mailchimpApiKey,
      mailchimpListId,
      wordpressUrl,
      wordpressUsername,
      wordpressAppPass,
    } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mailchimpApiKey,
        mailchimpListId,
        wordpressUrl,
        wordpressUsername,
        wordpressAppPass,
      },
    });

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update credentials' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        mailchimpApiKey: true,
        mailchimpListId: true,
        wordpressUrl: true,
        wordpressUsername: true,
        wordpressAppPass: true,
      },
    });

    return NextResponse.json(org || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}