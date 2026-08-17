import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

const VALID_ENERGY = new Set(['LOW', 'MEDIUM', 'HIGH']);
const VALID_MINUTES = new Set([5, 15, 30, 60, 120]);

interface ParsedTask {
  title: string;
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  estimatedMinutes: number | null;
  isFocusToday: boolean;
}

export async function POST(req: Request) {
  try {
    if (!(await requireOwner())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in environment variables.' }, { status: 500 });
    }

    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Same raw-fetch OpenAI pattern as src/app/api/leads/analyze/route.ts --
    // no openai package or Vercel AI SDK installed in this repo.
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You help someone with ADHD turn a messy brain dump into a clean task list.
            Read the raw notes and split them into distinct, actionable tasks (max 10). For each task, infer:
            - title: a concise, actionable task name.
            - energyLevel: "LOW" (quick win / low effort), "MEDIUM" (normal focus), or "HIGH" (deep focus / high effort).
            - estimatedMinutes: your best guess at how long it will take, rounded to the nearest of 5, 15, 30, 60, or 120.
            - isFocusToday: true if the text signals this is urgent or must happen today, else false.
            Return a JSON object of exactly this shape: {"tasks": [{"title": string, "energyLevel": "LOW"|"MEDIUM"|"HIGH", "estimatedMinutes": number, "isFocusToday": boolean}]}`,
          },
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return NextResponse.json({ error: 'Brain dump parse failed' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);
    const rawTasks: any[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    // response_format: json_object guarantees valid JSON, not this specific shape -- validate every field.
    const tasks: ParsedTask[] = rawTasks
      .filter((t) => typeof t?.title === 'string' && t.title.trim())
      .slice(0, 10)
      .map((t) => ({
        title: t.title.trim(),
        energyLevel: VALID_ENERGY.has(t.energyLevel) ? t.energyLevel : null,
        estimatedMinutes: VALID_MINUTES.has(t.estimatedMinutes) ? t.estimatedMinutes : null,
        isFocusToday: Boolean(t.isFocusToday),
      }));

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No tasks could be parsed from that text.' }, { status: 400 });
    }

    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Brain dump parse failed' }, { status: 500 });
  }
}
