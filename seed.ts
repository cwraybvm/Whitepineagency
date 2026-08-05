import "./load-env";
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
  // Email/password come from ADMIN_USERNAME/ADMIN_PASSWORD so this row stays
  // in sync with whatever the master-bypass credentials in route.ts are —
  // this is the real DB-backed fallback for when the bypass env var isn't
  // configured in a given deployment target. passwordHash used to be the
  // sentinel 'OAUTH_EXTERNAL_GATED', for an OAuth flow that was never wired
  // into src/app/api/auth/login/route.ts (which only does a plain password
  // comparison) — so this account could never log in via email+password.
  // Only touch passwordHash when ADMIN_PASSWORD is actually set, so running
  // this seed without it loaded doesn't clobber an existing password.
  const adminEmail = process.env.ADMIN_USERNAME || 'admin@whitepineagency.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  const user = await db.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'White Pine Admin',
      role: 'OWNER',
      ...(adminPassword ? { passwordHash: adminPassword } : {}),
    },
    create: {
      email: adminEmail,
      fullName: 'White Pine Admin',
      passwordHash: adminPassword || 'OAUTH_EXTERNAL_GATED',
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