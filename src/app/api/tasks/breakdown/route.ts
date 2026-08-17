import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI, Type } from '@google/genai';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

export async function POST(req: Request) {
  try {
    if (!(await requireOwner())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in environment variables.' },
        { status: 500 }
      );
    }

    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Task: "${title}"`,
      config: {
        systemInstruction: `You help someone with ADHD get unstuck on a task that feels too big to start.
        Break the given task into 3 to 5 tiny, frictionless sub-steps. Each sub-step must be concrete,
        take no more than 5-10 minutes, and require zero decision-making to begin (no "figure out" or "plan" steps).
        Order them in the sequence they should be done.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['subtasks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const steps: string[] = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];

    return NextResponse.json({ subtasks: steps.slice(0, 5) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gemini breakdown failed' }, { status: 500 });
  }
}
