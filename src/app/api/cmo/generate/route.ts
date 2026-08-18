import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireOrgMember } from '@/lib/portalAuth';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-5';

type AuditSummary = { strengths: string[]; bottlenecks: string[]; opportunities: string[] };
type Milestone = { id: string; month: 'Month 1' | 'Month 2' | 'Month 3'; text: string; status: 'pending' | 'completed' };

function currentQuarterLabel(d = new Date()): string {
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

function serialize(row: { id: string; auditSummary: string; roadmapItems: unknown; currentQuarter: string; createdAt: Date }) {
  return {
    id: row.id,
    audit: JSON.parse(row.auditSummary) as AuditSummary,
    roadmapItems: row.roadmapItems as Milestone[],
    currentQuarter: row.currentQuarter,
    createdAt: row.createdAt,
  };
}

export async function GET() {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const latest = await prisma.marketingStrategy.findFirst({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(latest ? serialize(latest) : null);
}

export async function POST(req: Request) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { industry, targetGoals } = (await req.json().catch(() => ({}))) as { industry?: string; targetGoals?: string };
  if (!industry?.trim() || !targetGoals?.trim()) {
    return NextResponse.json({ error: 'Industry and target goals are required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI generation is not configured' }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = `You are an elite Fractional CMO advising a client business. Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "audit": { "strengths": string[], "bottlenecks": string[], "opportunities": string[] },
  "roadmap": {
    "Month 1": string[],
    "Month 2": string[],
    "Month 3": string[]
  }
}
Each array holds 3 concise, actionable items written for a business owner, not a marketer.`;

  let parsed: { audit: AuditSummary; roadmap: Record<'Month 1' | 'Month 2' | 'Month 3', string[]> };
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Client industry: ${industry}\nTarget goals: ${targetGoals}` },
      ],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Anthropic response contained no text block');
    parsed = JSON.parse(textBlock.text);
  } catch (err: any) {
    console.error('[CMO_GENERATE_ERROR]', err);
    return NextResponse.json({ error: 'Failed to generate strategy' }, { status: 502 });
  }

  const roadmapItems: Milestone[] = (['Month 1', 'Month 2', 'Month 3'] as const).flatMap((month) =>
    (parsed.roadmap[month] || []).map((text) => ({ id: randomUUID(), month, text, status: 'pending' as const }))
  );

  const row = await prisma.marketingStrategy.create({
    data: {
      organizationId: auth.organizationId,
      auditSummary: JSON.stringify(parsed.audit),
      roadmapItems,
      currentQuarter: currentQuarterLabel(),
    },
  });

  return NextResponse.json(serialize(row));
}

export async function PATCH(req: Request) {
  const auth = await requireOrgMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { strategyId, milestoneId, status } = (await req.json().catch(() => ({}))) as {
    strategyId?: string;
    milestoneId?: string;
    status?: 'pending' | 'completed';
  };
  if (!strategyId || !milestoneId || (status !== 'pending' && status !== 'completed')) {
    return NextResponse.json({ error: 'strategyId, milestoneId and a valid status are required' }, { status: 400 });
  }

  const row = await prisma.marketingStrategy.findFirst({
    where: { id: strategyId, organizationId: auth.organizationId },
  });
  if (!row) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });

  const roadmapItems = (row.roadmapItems as Milestone[]).map((m) => (m.id === milestoneId ? { ...m, status } : m));

  const updated = await prisma.marketingStrategy.update({
    where: { id: row.id },
    data: { roadmapItems },
  });

  return NextResponse.json(serialize(updated));
}
