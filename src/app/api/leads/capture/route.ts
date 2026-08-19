import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 🏎️ Prisma 7 Driver Adapter Pattern -- same singleton pattern as
// src/app/api/leads/route.ts, copied verbatim rather than shared because
// each API route module needs its own module-scope singleton.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    return new PrismaClient();
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? getPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 🔓 No auth check, deliberately -- this is the public lead-magnet widget's
// capture endpoint (see components/widgets/LeadMagnetWidget.tsx), same
// public-by-design posture as /api/audit/competitor-intel it calls into.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  const { email, websiteUrl, competitorUrls } = (body ?? {}) as {
    email?: string;
    websiteUrl?: string;
    competitorUrls?: string[];
  };

  if (!email || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!websiteUrl || !websiteUrl.trim()) {
    return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 });
  }

  const cleanEmail = email.trim();
  const cleanUrl = websiteUrl.trim();
  const cleanCompetitorUrls = Array.isArray(competitorUrls)
    ? competitorUrls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 2)
    : [];

  const lead = await prisma.lead.create({
    data: {
      email: cleanEmail,
      url: cleanUrl,
      competitorUrls: cleanCompetitorUrls,
      memo: 'Captured via Competitor Audit lead magnet widget',
    },
  });

  // Immediately trigger the existing competitor-intel logic. Same-origin
  // internal call, same pattern competitor-intel/route.ts itself uses to
  // reach /api/audit/speed -- forward the caller's IP so competitor-intel's
  // own per-IP rate limit applies to the real visitor, not this server.
  let audit: unknown = null;
  try {
    const origin = new URL(request.url).origin;
    const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const auditRes = await fetch(`${origin}/api/audit/competitor-intel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
      },
      body: JSON.stringify({ clientUrl: cleanUrl, competitorUrls: cleanCompetitorUrls }),
    });
    if (auditRes.ok) {
      audit = await auditRes.json();
      await prisma.lead.update({ where: { id: lead.id }, data: { auditData: audit as any } });
    }
  } catch (err) {
    console.warn('⚠️ Competitor-intel generation failed for captured lead:', err);
  }

  return NextResponse.json({ success: true, leadId: lead.id, audit });
}
