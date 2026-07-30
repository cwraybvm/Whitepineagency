import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection — DATABASE_URL is pgbouncer transaction-mode
    // and can't hold the advisory lock `migrate` needs, which hangs the CLI.
    url: env('DIRECT_URL'),
  },
});