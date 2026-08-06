import { NextResponse } from 'next/server';
import { validateBlogPostInput } from '@/lib/sandboxPrompts';
import { generateBlogPostPackage } from '@/lib/blogPost';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateBlogPostInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const text = body.mode === 'notes' ? body.notes : body.draftCopy;
    const result = await generateBlogPostPackage(body.mode, text, body.tone, body.media || [], body.activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox blog-post error:', err);
    return NextResponse.json({ error: err.message || 'Blog post generation failed' }, { status: 500 });
  }
}
