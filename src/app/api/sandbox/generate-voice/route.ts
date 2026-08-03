import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { validateVoiceGenInput, synthesizeSpeech, VOICE_PERSONAS } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validationError = validateVoiceGenInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { sceneText, voicePersona } = body as { sceneText: string; voicePersona: keyof typeof VOICE_PERSONAS };

    const audioBuffer = await synthesizeSpeech(sceneText, voicePersona);
    const blob = await put(`sandbox-audio/${randomUUID()}.mp3`, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      voiceId: VOICE_PERSONAS[voicePersona].voice,
    });
  } catch (err: any) {
    console.error('Sandbox generate-voice error:', err);
    return NextResponse.json({ error: err.message || 'Voice generation failed' }, { status: 500 });
  }
}
