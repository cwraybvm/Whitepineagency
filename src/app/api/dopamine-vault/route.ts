import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSeedKey, getPeriodRange, getCompletedLines, type BingoPeriod } from '@/lib/bingo';
import { computeBoardCells } from '@/lib/bingoServer';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const store = await cookies();
  return store.get('role')?.value === 'OWNER';
}

// Consecutive-day streak of task completions, counted back from today (or
// from yesterday if nothing's been completed yet today, so the streak stays
// "active" until a full day is missed) -- mirrors taskStreak.ts's semantics
// but computed server-side from DB timestamps instead of localStorage.
function computeCompletionStreak(days: Set<string>): number {
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function hasCompletedBingoLine(period: BingoPeriod): Promise<boolean> {
  const now = new Date();
  const seedKey = getSeedKey(period, now);
  const { start, end } = getPeriodRange(period, now);
  const board = await prisma.bingoBoard.findUnique({ where: { period_seedKey: { period, seedKey } } });
  const manuallyCompleted = new Set<number>(Array.isArray(board?.completedCells) ? (board!.completedCells as number[]) : []);
  const cells = await computeBoardCells(period, seedKey, start, end, manuallyCompleted);
  return getCompletedLines(cells.map((c) => c.completed)).length > 0;
}

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [totalCompletedTasks, recentCompletions, focusAgg, totalFocusSessions, parkedCount, allCompletions, dailyBingo, weeklyBingo] =
    await Promise.all([
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.findMany({
        where: { status: 'DONE', completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 25,
        select: { id: true, title: true, completedAt: true, energyLevel: true },
      }),
      prisma.focusSession.aggregate({ _sum: { durationSeconds: true } }),
      prisma.focusSession.count(),
      prisma.task.count({ where: { parkedAt: { not: null } } }),
      prisma.task.findMany({ where: { completedAt: { not: null } }, select: { completedAt: true } }),
      hasCompletedBingoLine('DAILY'),
      hasCompletedBingoLine('WEEKLY'),
    ]);

  const totalFocusMinutes = Math.floor((focusAgg._sum.durationSeconds ?? 0) / 60);
  const completionDays = new Set(allCompletions.map((t) => t.completedAt!.toISOString().slice(0, 10)));
  const activeStreak = computeCompletionStreak(completionDays);
  const bingoChamp = dailyBingo || weeklyBingo;

  const badges = [
    {
      id: 'focus-master',
      label: 'Focus Master',
      description: 'Logged 2+ hours of Focus Mode time',
      unlocked: totalFocusMinutes >= 120,
    },
    {
      id: 'bingo-champ',
      label: 'Bingo Champ',
      description: 'Completed a line on the Daily or Weekly Bingo board',
      unlocked: bingoChamp,
    },
    {
      id: 'task-sweeper',
      label: 'Task Sweeper',
      description: 'Parked 3+ stale tasks to keep the board clean',
      unlocked: parkedCount >= 3,
    },
  ];

  return NextResponse.json({
    totalCompletedTasks,
    recentCompletions: recentCompletions.map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt,
      category: t.energyLevel,
    })),
    focus: {
      totalMinutes: totalFocusMinutes,
      totalSessions: totalFocusSessions,
      activeStreak,
    },
    badges,
  });
}
