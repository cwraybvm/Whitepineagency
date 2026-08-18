import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

interface ExistingSubtask {
  id: string;
  title: string;
  done: boolean;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireOwner())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in environment variables.' }, { status: 500 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const existingSteps: ExistingSubtask[] = Array.isArray(task.subtasks) ? (task.subtasks as unknown as ExistingSubtask[]) : [];
    const knownTitles = existingSteps.map((s) => s.title).join('; ');

    // Same raw-fetch OpenAI pattern as /api/focus-tasks/parse-brain-dump --
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
            content: `You help someone with ADHD get unstuck on a task that feels too big or vague to start.
            Give exactly 3 tiny, concrete, low-friction micro-steps for the task. Each step must take no more
            than 5-10 minutes and require zero decision-making to begin (no "figure out" or "plan" steps).
            Order them in the sequence they should be done.${
              knownTitles ? ` These steps are already planned -- do not repeat or rephrase them: ${knownTitles}.` : ''
            }
            Return a JSON object of exactly this shape: {"steps": [string, string, string]}`,
          },
          {
            role: 'user',
            content: `Task: "${task.title}"`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return NextResponse.json({ error: 'Unstick Me failed' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);
    const rawSteps: unknown[] = Array.isArray(parsed.steps) ? parsed.steps : [];

    // response_format: json_object guarantees valid JSON, not this specific shape -- validate.
    const newSteps: ExistingSubtask[] = rawSteps
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 3)
      .map((title) => ({ id: crypto.randomUUID(), title: title.trim(), done: false }));

    if (newSteps.length === 0) {
      return NextResponse.json({ error: 'No steps could be generated for that task.' }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        subtasks: [...existingSteps, ...newSteps] as unknown as Prisma.InputJsonValue,
        unstickedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unstick Me failed' }, { status: 500 });
  }
}
