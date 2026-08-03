import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { slaDeadlineFor } from '@/lib/fulfillmentSla';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📥 GET: list fulfillment tasks, org-scoped like /api/leads
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const headerOrgId = request.headers.get('x-organization-id');
    const paramOrgId = searchParams.get('orgId');
    const rawOrgId = (headerOrgId && headerOrgId !== 'default-tenant-workspace') ? headerOrgId : paramOrgId;
    const targetOrgId = (rawOrgId && rawOrgId !== 'default-tenant-workspace') ? rawOrgId : null;

    const tasks = await prisma.fulfillmentTask.findMany({
      where: targetOrgId ? { organizationId: targetOrgId } : {},
      include: { checklist: { orderBy: { orderPosition: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Fulfillment GET failed:', error);
    return NextResponse.json({ error: 'Failed to load fulfillment tasks' }, { status: 500 });
  }
}

// 📤 POST: create a new fulfillment task (e.g. new client onboarding)
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const headerOrgId = request.headers.get('x-organization-id');
    const effectiveOrgId = body.organizationId || (headerOrgId && headerOrgId !== 'default-tenant-workspace' ? headerOrgId : null);

    const status = body.status || 'Intake Pending';
    const now = new Date();

    const task = await prisma.fulfillmentTask.create({
      data: {
        organizationId: effectiveOrgId || undefined,
        title: body.title || 'New Deliverable',
        clientName: body.clientName || 'New Client',
        ownerName: body.ownerName || 'N/A',
        trade: body.trade || 'General Trade',
        status,
        contractValue: Number(body.contractValue) || 0,
        driveFolderUrl: body.driveFolderUrl || undefined,
        contactEmail: body.contactEmail || 'N/A',
        contactPhone: body.contactPhone || 'N/A',
        offerHeadline: body.offerHeadline || undefined,
        notes: body.notes || undefined,
        targetLinkUrl: body.targetLinkUrl || undefined,
        stageEnteredAt: now,
        slaDeadline: slaDeadlineFor(status, now),
        checklist: Array.isArray(body.checklist)
          ? {
              create: body.checklist.map((item: any, idx: number) => ({
                label: String(item.label),
                done: Boolean(item.done),
                orderPosition: idx,
              })),
            }
          : undefined,
      },
      include: { checklist: true },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Fulfillment POST failed:', error);
    return NextResponse.json({ error: 'Failed to create fulfillment task' }, { status: 500 });
  }
}

// 🔄 PUT: update task fields — status change recomputes the SLA timer from now()
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, notes, driveFolderUrl, offerHeadline, targetLinkUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (notes !== undefined) data.notes = notes;
    if (driveFolderUrl !== undefined) data.driveFolderUrl = driveFolderUrl;
    if (offerHeadline !== undefined) data.offerHeadline = offerHeadline;
    if (targetLinkUrl !== undefined) data.targetLinkUrl = targetLinkUrl;

    if (status) {
      const now = new Date();
      data.status = status;
      data.stageEnteredAt = now;
      data.slaDeadline = slaDeadlineFor(status, now);
    }

    const task = await prisma.fulfillmentTask.update({
      where: { id },
      data,
      include: { checklist: { orderBy: { orderPosition: 'asc' } } },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Fulfillment PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update fulfillment task' }, { status: 500 });
  }
}
