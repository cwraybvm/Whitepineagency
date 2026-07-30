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
  const user = await db.user.upsert({
    where: { email: 'colin@example.com' }, 
    update: {
      fullName: 'Colin Wray',
      role: 'ADMIN',
    },
    create: {
      email: 'colin@example.com',
      fullName: 'Colin Wray',
      passwordHash: 'OAUTH_EXTERNAL_GATED',
      role: 'ADMIN',
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