import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: list all publication issues, soonest deadline first
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const issues = await prisma.bvmPublicationIssue.findMany({ orderBy: { deadlineDate: 'asc' } });
  return NextResponse.json(issues);
}

// ➕ POST: create a publication issue
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { issueName, deadlineDate, adSpaceGoal, adSpaceSold } = await request.json();
    if (!issueName || !deadlineDate || adSpaceGoal === undefined) {
      return NextResponse.json({ error: 'Missing issueName, deadlineDate, or adSpaceGoal' }, { status: 400 });
    }

    const issue = await prisma.bvmPublicationIssue.create({
      data: {
        issueName,
        deadlineDate: new Date(deadlineDate),
        adSpaceGoal: Number(adSpaceGoal),
        adSpaceSold: Number(adSpaceSold) || 0,
      },
    });

    return NextResponse.json({ success: true, issue }, { status: 201 });
  } catch (error) {
    console.error('BVM issue POST failed:', error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}

// 🔄 PATCH: edit an issue (name, deadline, goal, amount sold)
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, issueName, deadlineDate, adSpaceGoal, adSpaceSold } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing issue ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (issueName !== undefined) data.issueName = issueName;
    if (deadlineDate !== undefined) data.deadlineDate = new Date(deadlineDate);
    if (adSpaceGoal !== undefined) data.adSpaceGoal = Number(adSpaceGoal);
    if (adSpaceSold !== undefined) data.adSpaceSold = Number(adSpaceSold);

    const issue = await prisma.bvmPublicationIssue.update({ where: { id }, data });
    return NextResponse.json({ success: true, issue });
  } catch (error) {
    console.error('BVM issue PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

// 🗑️ DELETE: remove an issue
export async function DELETE(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing issue ID' }, { status: 400 });
  }

  try {
    await prisma.bvmPublicationIssue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BVM issue DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
  }
}
