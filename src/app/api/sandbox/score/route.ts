import { NextResponse } from 'next/server';
import { scoreCreative, type ScorableType } from '@/lib/creativeScore';

const VALID_TYPES: ScorableType[] = ['COPY', 'AD', 'VIDEO_SCRIPT', 'DRIP'];

export async function POST(req: Request) {
  try {
    const { content, type, metadata } = await req.json();

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const result = scoreCreative(content, type, metadata);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scoring failed' }, { status: 500 });
  }
}
