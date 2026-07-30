import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. Establish the connection pool using the environment variable
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Wrap it with the official Prisma 7 Postgres adapter layer
const adapter = new PrismaPg(pool);

// 3. Initialize the Client using the adapter instance
export const db =
  globalForPrisma.prisma ?? 
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;