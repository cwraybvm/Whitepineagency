import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') || 'default-org';

  try {
    const keywords = await prisma.seoKeyword.findMany({
      where: { organizationId },
      orderBy: { currentRank: 'asc' },
    });

    return NextResponse.json(keywords);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SEO metrics' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { organizationId = 'default-org', keyword, targetUrl, currentRank, searchVolume } = await req.json();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const newKeyword = await prisma.seoKeyword.create({
      data: {
        organizationId,
        keyword,
        targetUrl,
        currentRank: Number(currentRank) || 100,
        previousRank: Number(currentRank) || 100,
        searchVolume: Number(searchVolume) || 0,
      },
    });

    return NextResponse.json(newKeyword);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to track keyword' }, { status: 500 });
  }
}