import { prisma } from './prisma';

// Resolves the org_id cookie (a real Organization.id for logged-in users, or a
// human-readable slug like "demo-apex-plumbing" for the demo-auth flow) to a
// real Organization row, creating the workspace on first use.
export async function resolveOrganizationId(orgIdCookie: string): Promise<string> {
  const byId = await prisma.organization.findUnique({ where: { id: orgIdCookie } });
  if (byId) return byId.id;

  const bySlug = await prisma.organization.findUnique({ where: { slug: orgIdCookie } });
  if (bySlug) return bySlug.id;

  const created = await prisma.organization.create({
    data: { slug: orgIdCookie, name: 'Demo Organization' },
  });
  return created.id;
}
