import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = ['PRODUCTION', 'FAILED'];

// Same CRON_SECRET posture as /api/cron/sla-check.
function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('⚠️ CRON_SECRET not set — /api/cron/sandbox-purge is running unauthenticated.');
    return true;
  }
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

// Deliberately scoped to metadata.sandboxScenario-tagged records only — real
// client CreativeAssets (created through the normal Sandbox UI, no scenario
// tag) are never touched here no matter how old they are.
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - RETENTION_MS);

    const candidates = await prisma.creativeAsset.findMany({
      where: { createdAt: { lt: cutoff }, status: { in: TERMINAL_STATUSES } },
      select: { id: true, metadata: true },
    });

    const idsToPurge = candidates
      .filter((c) => Boolean((c.metadata as Record<string, unknown> | null)?.sandboxScenario))
      .map((c) => c.id);

    if (idsToPurge.length === 0) {
      return NextResponse.json({ success: true, purged: 0 });
    }

    const { count } = await prisma.creativeAsset.deleteMany({ where: { id: { in: idsToPurge } } });

    return NextResponse.json({ success: true, purged: count });
  } catch (error) {
    console.error('Sandbox purge cron failed:', error);
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
  }
}
