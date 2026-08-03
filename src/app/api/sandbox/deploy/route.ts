import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { buildPlatformPayload, type Platform } from '@/lib/platformExport';

const VALID_PLATFORMS: Platform[] = ['META', 'GOOGLE', 'TIKTOK'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, assetIds, platform, targetUrls } = body;

    if (action !== 'deploy' && action !== 'export') {
      return NextResponse.json({ error: "action must be 'deploy' or 'export'" }, { status: 400 });
    }
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ error: 'assetIds must be a non-empty array' }, { status: 400 });
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: `platform must be one of ${VALID_PLATFORMS.join(', ')}` }, { status: 400 });
    }

    const assets = await prisma.creativeAsset.findMany({
      where: { id: { in: assetIds } },
      include: { organization: { select: { customDomain: true } } },
    });

    const foundIds = new Set(assets.map((a) => a.id));
    const missingIds = assetIds.filter((id: string) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Asset(s) not found: ${missingIds.join(', ')}` }, { status: 404 });
    }

    const missingTargetUrl: string[] = [];
    const resolved = assets.map((asset) => {
      const targetUrl = asset.organization?.customDomain || targetUrls?.[asset.id];
      if (!targetUrl) missingTargetUrl.push(asset.id);
      return { asset, targetUrl };
    });
    if (missingTargetUrl.length > 0) {
      return NextResponse.json({ error: `Missing target URL for asset(s): ${missingTargetUrl.join(', ')}` }, { status: 400 });
    }

    const payloads = resolved.map(({ asset, targetUrl }) => buildPlatformPayload(asset, platform, targetUrl!));

    if (action === 'export') {
      const zip = new JSZip();
      payloads.forEach((p) => zip.file(`${p.assetId}-${platform}.json`, JSON.stringify(p, null, 2)));
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="platform-export.zip"',
        },
      });
    }

    const deployedAt = new Date().toISOString();
    await prisma.$transaction(
      resolved.map(({ asset, targetUrl }) =>
        prisma.creativeAsset.update({
          where: { id: asset.id },
          data: {
            metadata: {
              ...((asset.metadata as object | null) || {}),
              deployments: {
                ...((asset.metadata as any)?.deployments || {}),
                [platform]: { status: 'ACTIVE', targetUrl, deployedAt },
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ success: true, payloads });
  } catch (err: any) {
    console.error('Sandbox deploy error:', err);
    return NextResponse.json({ error: err.message || 'Deploy failed' }, { status: 500 });
  }
}
