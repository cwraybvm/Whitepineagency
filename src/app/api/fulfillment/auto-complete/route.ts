import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FULFILLMENT_STAGES, slaDeadlineFor } from '@/lib/fulfillmentSla';

export const dynamic = 'force-dynamic';

// Accepts either `Authorization: Bearer <CRON_SECRET>` (for automation
// platforms that set headers) or a `secret` field in the body (for ones
// that only post JSON, e.g. a simple Zapier/Make.com webhook action).
// Same warn-and-allow posture as the other CRON_SECRET-gated routes when
// it isn't configured yet.
function verifyRequest(request: Request, bodySecret?: string): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    console.warn('⚠️ CRON_SECRET not set — /api/fulfillment/auto-complete is running unauthenticated.');
    return true;
  }
  if (request.headers.get('authorization') === `Bearer ${configured}`) return true;
  return bodySecret === configured;
}

// 🤖 POST: inbound auto-completion — an external automation (Zapier, an AI
// receptionist callback, a QA bot, etc.) reports a checklist item done.
// Marks it complete, appends an audit line to the task notes, and — if
// every item on the task is now done — advances the task to the next
// fulfillment stage and recomputes its SLA deadline from that moment.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, checklistItemId, source, secret } = body;

    if (!verifyRequest(request, secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId || !checklistItemId) {
      return NextResponse.json({ error: 'taskId and checklistItemId are required' }, { status: 400 });
    }

    const item = await prisma.fulfillmentChecklistItem.findUnique({ where: { id: checklistItemId } });
    if (!item || item.taskId !== taskId) {
      return NextResponse.json({ error: 'Checklist item not found for this task' }, { status: 404 });
    }

    const updatedItem = await prisma.fulfillmentChecklistItem.update({
      where: { id: checklistItemId },
      data: { done: true },
    });

    const task = await prisma.fulfillmentTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { checklist: true },
    });

    const auditLine = `[AUTO ${new Date().toISOString()}] ${source || 'unknown-source'} completed "${item.label}"`;
    const nextNotes = task.notes ? `${task.notes}\n${auditLine}` : auditLine;

    const allDone = task.checklist.every((i) => i.done);
    const currentIdx = FULFILLMENT_STAGES.indexOf(task.status);
    const shouldAdvance = allDone && currentIdx !== -1 && currentIdx < FULFILLMENT_STAGES.length - 1;

    const now = new Date();
    const nextStatus = shouldAdvance ? FULFILLMENT_STAGES[currentIdx + 1] : task.status;
    const stageAdvanced = nextStatus !== task.status;

    const updatedTask = await prisma.fulfillmentTask.update({
      where: { id: taskId },
      data: {
        notes: nextNotes,
        ...(stageAdvanced
          ? { status: nextStatus, stageEnteredAt: now, slaDeadline: slaDeadlineFor(nextStatus, now) }
          : {}),
      },
      include: { checklist: { orderBy: { orderPosition: 'asc' } } },
    });

    return NextResponse.json({ success: true, task: updatedTask, item: updatedItem, stageAdvanced });
  } catch (error) {
    console.error('Fulfillment auto-complete webhook failed:', error);
    return NextResponse.json({ error: 'Auto-complete failed' }, { status: 500 });
  }
}
