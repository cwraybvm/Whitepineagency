import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Root cause (see seed.ts): the OWNER user colin@example.com was seeded with
// passwordHash: 'OAUTH_EXTERNAL_GATED' — a sentinel for an OAuth flow that
// was never actually wired into src/app/api/auth/login/route.ts, which only
// does a plain password comparison. That account could never log in via
// email+password, and re-running seed.ts doesn't fix it either since its
// user.upsert `update` clause never touches passwordHash.
//
// This resets it to a real, known credential: the same ADMIN_PASSWORD
// already used by the bypass path in login/route.ts, so there's one admin
// credential to remember instead of two.
async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set in the environment — nothing to reset the credential to.');
  }

  // Deferred until after dotenv.config() above: a top-level `import` of
  // db.ts would read DATABASE_URL before it's loaded (ESM import hoisting).
  const { db } = await import("./src/lib/db");

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

  const user = await db.user.upsert({
    where: { email: 'colin@example.com' },
    update: {
      passwordHash: password,
      role: 'OWNER',
    },
    create: {
      email: 'colin@example.com',
      fullName: 'Colin Wray',
      passwordHash: password,
      role: 'OWNER',
    },
  });

  await db.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  console.log(`Reset password for ${user.email} (role: ${user.role}) to match ADMIN_PASSWORD.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
