export const VOICE_PERSONAS: Record<'Energetic' | 'Professional' | 'Warm', { voice: string; instructions: string }> = {
  Energetic: { voice: 'onyx', instructions: 'Deliver with upbeat, high energy, fast-paced enthusiasm.' },
  Professional: { voice: 'onyx', instructions: 'Deliver clear, confident, measured, corporate-neutral.' },
  Warm: { voice: 'onyx', instructions: 'Deliver friendly, reassuring, at a relaxed conversational pace.' },
};

export function validateVoiceGenInput(body: any): string | null {
  if (typeof body?.sceneText !== 'string' || !body.sceneText.trim()) {
    return 'sceneText is required';
  }
  if (!VOICE_PERSONAS[body?.voicePersona as keyof typeof VOICE_PERSONAS]) {
    return `voicePersona must be one of ${Object.keys(VOICE_PERSONAS).join(', ')}`;
  }
  return null;
}

export async function synthesizeSpeech(text: string, persona: keyof typeof VOICE_PERSONAS): Promise<Buffer> {
  const { voice, instructions } = VOICE_PERSONAS[persona];
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || 'OpenAI TTS request failed');
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
