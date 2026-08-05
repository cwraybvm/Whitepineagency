import { NextResponse } from 'next/server';
import { generateMidjourneyPromptFromImage } from '@/lib/brandExtractor';

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    const prompt = await generateMidjourneyPromptFromImage(imageUrl);
    return NextResponse.json({ success: true, prompt });
  } catch (err: any) {
    console.error('Sandbox image-prompt error:', err);
    return NextResponse.json({ error: err.message || 'Prompt generation failed' }, { status: 500 });
  }
}
