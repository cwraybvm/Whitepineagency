#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Mirrors FEATURE_KEYS in src/config/tenantFeatures.ts — keep in sync if that list changes.
const FEATURE_KEYS = [
  'copy', 'ad', 'video', 'landing-page', 'campaign', 'swipe',
  'brand-identity', 'master-campaign', 'compliance-audit', 'direct-mail', 'blog-post',
];

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(raw);
    if (!match) continue;
    const [, key, value] = match;
    args[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return args;
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name) {
    console.error('Usage: node create-client-app.js --name="Client Name" [--color=#2563eb] [--features=copy,ad]');
    process.exit(1);
  }

  if (args.color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(args.color)) {
    console.error(`Invalid --color "${args.color}" — expected a hex value like #2563eb.`);
    process.exit(1);
  }

  const baseSlug = slugify(args.name);
  if (!baseSlug) {
    console.error(`--name "${args.name}" produced an empty slug.`);
    process.exit(1);
  }

  // disabledFeatures stores what's OFF; --features lists what the client should HAVE, so invert.
  const requestedFeatures = args.features
    ? args.features.split(',').map((f) => f.trim()).filter(Boolean)
    : null;
  const disabledFeatures = requestedFeatures
    ? FEATURE_KEYS.filter((key) => !requestedFeatures.includes(key))
    : [];

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    let slug = baseSlug;
    let org;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        org = await db.organization.create({
          data: {
            name: args.name,
            slug,
            primaryColor: args.color || null,
            disabledFeatures,
          },
        });
        break;
      } catch (err) {
        if (err.code === 'P2002' && attempt < 4) {
          slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
          continue;
        }
        throw err;
      }
    }

    console.log(`Created client "${org.name}" — tenant ID: ${org.id} (slug: ${org.slug})`);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Failed to create client:', err.message);
  process.exit(1);
});
