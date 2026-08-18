import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Real membership check (unlike portalOrg.ts's resolveOrganizationId, which
// just trusts the org_id cookie and auto-creates orgs for the demo flow).
// Used by routes that write org-scoped data on the client's behalf, where we
// need to know the signed-in user is actually a member of that org.
export async function requireOrgMember(): Promise<{ userId: string; organizationId: string } | null> {
  const store = await cookies();
  const userId = store.get('user_session')?.value;
  const organizationId = store.get('org_id')?.value;
  if (!userId || !organizationId) return null;

  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!member) return null;

  return { userId, organizationId };
}
