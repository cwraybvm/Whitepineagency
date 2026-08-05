import { NextResponse } from 'next/server';
import { validateDirectMailInput } from '@/lib/sandboxPrompts';
import { generateDirectMailPackage } from '@/lib/directMail';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateDirectMailInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await generateDirectMailPackage(
      body.briefText,
      body.formFactor,
      body.audiences,
      body.qrUrl,
      body.activeBrandDna,
    );

    return NextResponse.json({ success: true, ...result, formFactor: body.formFactor, qrUrl: body.qrUrl });
  } catch (err: any) {
    console.error('Sandbox direct-mail error:', err);
    return NextResponse.json({ error: err.message || 'Direct mail generation failed' }, { status: 500 });
  }
}
