import { NextResponse } from 'next/server';
import { GBP_REVIEW_RESPONDER_PROMPT, callOpenAiJson, mockGbpReviewResponse, GbpReviewResponseSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { reviewText, starRating, location, serviceKeyword, brandName } = await req.json();

    if (!reviewText || typeof reviewText !== 'string' || !reviewText.trim()) {
      return NextResponse.json({ error: 'reviewText is required' }, { status: 400 });
    }
    if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) {
      return NextResponse.json({ error: 'starRating must be an integer from 1 to 5' }, { status: 400 });
    }

    const userContext = [
      `Review text: ${reviewText}`,
      `Star rating: ${starRating}/5`,
      location ? `Location: ${location}` : '',
      serviceKeyword ? `Core service keyword: ${serviceKeyword}` : '',
      brandName ? `Brand name: ${brandName}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callOpenAiJson(
      GBP_REVIEW_RESPONDER_PROMPT,
      userContext,
      () => mockGbpReviewResponse(reviewText, starRating, location, serviceKeyword),
      0.7,
      GbpReviewResponseSchema,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('GBP review response error:', err);
    return NextResponse.json({ error: err.message || 'Review response generation failed' }, { status: 500 });
  }
}
