import { db } from "./src/lib/db"; // 🛡️ Restored the database client import

async function main() {
  // 1. Create the Organization
  const organization = await db.organization.upsert({
    where: { slug: 'white-pine-agency' },
    update: {},
    create: {
      name: 'White Pine Agency',
      slug: 'white-pine-agency',
      domain: 'white-pine-agency.com',
      status: 'ACTIVE',
    },
  });

  // 2. Create or Update the User
  //
  // passwordHash used to be the sentinel 'OAUTH_EXTERNAL_GATED', for an OAuth
  // flow that was never wired into src/app/api/auth/login/route.ts (which
  // only does a plain password comparison) — so this account could never log
  // in via email+password. Falls back to that same broken sentinel only if
  // ADMIN_PASSWORD isn't set, so a fresh `npx tsx seed.ts` run doesn't
  // silently reintroduce the bug when it is.
  const user = await db.user.upsert({
    where: { email: 'colin@example.com' },
    update: {
      fullName: 'Colin Wray',
      role: 'OWNER',
    },
    create: {
      email: 'colin@example.com',
      fullName: 'Colin Wray',
      passwordHash: process.env.ADMIN_PASSWORD || 'OAUTH_EXTERNAL_GATED',
      role: 'OWNER',
    },
  });

  // 3. Connect the User to the Organization via the Member join table
  await db.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: 'ADMIN',
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  console.log("🚀 Database seeded successfully!");
}

// Execute the main function and handle proper database disconnection
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

// Force TypeScript to recognize this file as an isolated module
export {};