import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '@/lib/prisma';

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

    const { text } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Raw notes:\n"""\n${text}\n"""`,
      config: {
        systemInstruction: `You help someone with ADHD turn a messy brain dump into a clean task
        list. Read the raw notes and split them into distinct, actionable tasks (max 10). For
        each task, also break it into 3 to 5 tiny, frictionless sub-steps. Each sub-step must be
        concrete, take no more than 5-10 minutes, and require zero decision-making to begin (no
        "figure out" or "plan" steps). Order sub-steps in the sequence they should be done.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'subtasks'],
              },
            },
          },
          required: ['tasks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const parsedTasks: { title: string; subtasks: string[] }[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const toCreate = parsedTasks.slice(0, 10).filter((t) => t.title?.trim());

    if (toCreate.length === 0) {
      return NextResponse.json({ error: 'No tasks could be parsed from that text.' }, { status: 400 });
    }

    const created = await prisma.$transaction(
      toCreate.map((t) =>
        prisma.task.create({
          data: {
            title: t.title.trim(),
            subtasks: (t.subtasks || []).slice(0, 5).map((title) => ({
              id: crypto.randomUUID(),
              title,
              done: false,
            })),
          },
        })
      )
    );

    return NextResponse.json({ tasks: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Brain dump parse failed' }, { status: 500 });
  }
}
