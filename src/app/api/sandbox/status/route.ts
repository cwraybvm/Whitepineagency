import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const RECENT_LIMIT = 100;

interface AssetMeta {
  autoFulfill?: boolean;
  sandboxScenario?: string;
  sandboxRunId?: string;
}

// Diagnostics over the on-demand auto-fulfill engine — there's no real
// queue/worker to report on (see src/lib/sandboxAutoFulfill.ts for why:
// this runs on Vercel serverless, so "background job health" is really
// just "how many tagged assets are waiting for their next read").
export async function GET() {
  try {
    const [statusCounts, recent] = await Promise.all([
      prisma.creativeAsset.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.creativeAsset.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, status: true, createdAt: true, updatedAt: true, metadata: true },
      }),
    ]);

    let pendingAutoFulfill = 0;
    const runsById = new Map<string, { runId: string; scenario: string; assetCount: number; finalStatuses: string[] }>();

    for (const asset of recent) {
      const meta = (asset.metadata as AssetMeta | null) ?? {};

      if (meta.autoFulfill && asset.status !== 'PRODUCTION' && asset.status !== 'FAILED') {
        pendingAutoFulfill++;
      }

      if (meta.sandboxRunId && meta.sandboxScenario) {
        const entry = runsById.get(meta.sandboxRunId) ?? {
          runId: meta.sandboxRunId,
          scenario: meta.sandboxScenario,
          assetCount: 0,
          finalStatuses: [],
        };
        entry.assetCount++;
        entry.finalStatuses.push(asset.status);
        runsById.set(meta.sandboxRunId, entry);
      }
    }

    const recentRuns = Array.from(runsById.values())
      .slice(-10)
      .reverse();

    return NextResponse.json({
      statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
      pendingAutoFulfill,
      recentScenarioRuns: recentRuns,
      sampledFrom: recent.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load sandbox status' }, { status: 500 });
  }
}
