import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { weekRange } from '@/lib/weekRange';
import { computeGoalCurrentValue } from '@/lib/goalProgress';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 🎁 GET: every non-claimed goal (active + unlocked-not-yet-claimed),
// currentValue/isUnlocked/unlockedAt refreshed from live data and persisted
// (write-through, same pattern as the Drop-Off Route geocode cache).
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const goals = await prisma.rewardGoal.findMany({ where: { claimed: false }, orderBy: { createdAt: 'desc' } });

  const results = [];
  for (const goal of goals) {
    const currentValue = await computeGoalCurrentValue(goal.targetType, goal.startDate, goal.endDate);
    const newlyUnlocked = !goal.isUnlocked && currentValue >= goal.targetValue;

    const data: Record<string, unknown> = {};
    if (currentValue !== goal.currentValue) data.currentValue = currentValue;
    if (newlyUnlocked) {
      data.isUnlocked = true;
      data.unlockedAt = new Date();
    }

    if (Object.keys(data).length > 0) {
      results.push(await prisma.rewardGoal.update({ where: { id: goal.id }, data }));
    } else {
      results.push(goal);
    }
  }

  return NextResponse.json(results);
}

function resolveTimeframeRange(timeframe: string, customStart?: string, customEnd?: string): { start: Date; end: Date } | { error: string } {
  const now = new Date();

  if (timeframe === 'WEEKLY') {
    const { start, end } = weekRange(now.toISOString().slice(0, 10));
    return { start: new Date(`${start}T00:00:00.000Z`), end: new Date(`${end}T00:00:00.000Z`) };
  }
  if (timeframe === 'MONTHLY') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }
  if (timeframe === 'QUARTERLY') {
    const quarter = Math.floor(now.getUTCMonth() / 3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3 + 3, 1));
    return { start, end };
  }
  if (timeframe === 'CUSTOM') {
    if (!customStart || !customEnd) return { error: 'Custom timeframe requires startDate and endDate' };
    return { start: new Date(`${customStart}T00:00:00.000Z`), end: new Date(`${customEnd}T00:00:00.000Z`) };
  }
  return { error: 'Invalid timeframe' };
}

// ➕ POST: create a new incentive goal. For WEEKLY/MONTHLY/QUARTERLY the
// server computes the canonical current-period range itself -- client-sent
// dates for those are ignored, only CUSTOM trusts client dates.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, targetType, targetValue, timeframe, startDate, endDate, rewardIcon } = await request.json();

    if (!title || !targetType || !targetValue || !timeframe || !rewardIcon) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const range = resolveTimeframeRange(timeframe, startDate, endDate);
    if ('error' in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const goal = await prisma.rewardGoal.create({
      data: {
        title,
        targetType,
        targetValue: Number(targetValue),
        timeframe,
        startDate: range.start,
        endDate: range.end,
        rewardIcon,
      },
    });

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (error) {
    console.error('RewardGoal POST failed:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
