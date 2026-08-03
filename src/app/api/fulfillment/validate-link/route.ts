import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

const VERIFY_LINK_LABEL = 'verify target link';

// 🔗 POST: fetch the task's live target URL — if it resolves 200 OK, auto-
// check the "Verify Target Link" checklist item.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = await prisma.fulfillmentTask.findUnique({
      where: { id: taskId },
      include: { checklist: true },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (!task.targetLinkUrl) {
      return NextResponse.json({ error: 'No target link URL set on this task' }, { status: 400 });
    }

    let statusCode = 0;
    let ok = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(task.targetLinkUrl, { method: 'GET', redirect: 'follow', signal: controller.signal });
      clearTimeout(timeout);
      statusCode = res.status;
      ok = res.status === 200;
    } catch (fetchError) {
      console.error(`Link validation fetch failed for task ${taskId}:`, fetchError);
    }

    let updatedItem = null;
    if (ok) {
      const target = task.checklist.find((i) => i.label.trim().toLowerCase() === VERIFY_LINK_LABEL);
      if (target && !target.done) {
        updatedItem = await prisma.fulfillmentChecklistItem.update({
          where: { id: target.id },
          data: { done: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      ok,
      statusCode,
      checklistUpdated: Boolean(updatedItem),
      item: updatedItem,
    });
  } catch (error: any) {
    console.error('Link validation failed:', error);
    return NextResponse.json({ error: error.message || 'Link validation failed' }, { status: 500 });
  }
}
