import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 🔄 PATCH: edit a goal's title/target/icon, or claim/archive it ({ claimed: true })
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { title, targetValue, rewardIcon, claimed } = await request.json();

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (targetValue !== undefined) data.targetValue = Number(targetValue);
    if (rewardIcon !== undefined) data.rewardIcon = rewardIcon;
    if (claimed !== undefined) data.claimed = Boolean(claimed);

    const goal = await prisma.rewardGoal.update({ where: { id }, data });
    return NextResponse.json({ success: true, goal });
  } catch (error) {
    console.error('RewardGoal PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}
