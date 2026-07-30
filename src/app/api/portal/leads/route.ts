import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveOrganizationId } from '@/lib/portalOrg';

function serializeLead(lead: Awaited<ReturnType<typeof prisma.portalLead.findFirstOrThrow>> & {
  history: { id: string; event: string; statusBadge: string; createdAt: Date }[];
  chatMessages: { id: string; sender: string; text: string; createdAt: Date }[];
}) {
  return {
    id: lead.id,
    customerName: lead.customerName,
    phone: lead.phone,
    address: lead.address ?? undefined,
    createdAt: lead.createdAt.toISOString(),
    title: lead.title,
    subtitle: lead.subtitle,
    jobCategory: lead.jobCategory,
    badge: lead.badge,
    badgeColor: lead.badgeColor,
    source: lead.source,
    fmsStatus: lead.fmsStatus,
    fmsJobId: lead.fmsJobId ?? undefined,
    estimatedValue: lead.estimatedValue,
    closedValue: lead.closedValue ?? undefined,
    status: lead.status,
    assignedTechId: lead.assignedTechId ?? undefined,
    scheduledAt: lead.scheduledAt ? lead.scheduledAt.toISOString() : undefined,
    unrepliedMinutes: lead.unrepliedMinutes,
    isVip: lead.isVip,
    pastJobCount: lead.pastJobCount ?? undefined,
    isDuplicate: lead.isDuplicate,
    duplicateCount: lead.duplicateCount ?? undefined,
    isSnoozed: lead.isSnoozed,
    snoozeUntil: lead.snoozeUntil ?? undefined,
    isPinned: lead.isPinned,
    dispatchNote: lead.dispatchNote ?? undefined,
    aiSummary: lead.aiIssue
      ? {
          issue: lead.aiIssue,
          location: lead.aiLocation ?? '',
          requestedTime: lead.aiRequestedTime ?? '',
          issueAudioTime: lead.aiIssueAudioTime ?? undefined,
          locationAudioTime: lead.aiLocationAudioTime ?? undefined,
          timeAudioTime: lead.aiTimeAudioTime ?? undefined,
        }
      : undefined,
    hasAudio: lead.hasAudio,
    audioDuration: lead.audioDuration ?? undefined,
    transcript: lead.transcript ?? undefined,
    history: lead.history.map((h) => ({
      date: h.createdAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      event: h.event,
      statusBadge: h.statusBadge,
    })),
    chatThread: lead.chatMessages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;

  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);

  const leads = await prisma.portalLead.findMany({
    where: { organizationId },
    include: {
      history: { orderBy: { createdAt: 'asc' } },
      chatMessages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    { leads: leads.map(serializeLead) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;

  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);
  const body = await request.json();

  const lead = await prisma.portalLead.create({
    data: {
      organizationId,
      customerName: body.customerName || 'New Lead',
      phone: body.phone || 'N/A',
      address: body.address,
      title: body.title || 'New Inbound Lead',
      subtitle: body.subtitle || '',
      jobCategory: body.jobCategory || 'General Service',
      badge: body.badge || '',
      badgeColor: body.badgeColor || 'bg-slate-800 text-slate-200 border border-white/10',
      source: body.source || 'organic_web',
      fmsStatus: body.fmsStatus || 'not_applicable',
      estimatedValue: Number(body.estimatedValue) || 0,
      status: body.status || 'pending',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      isVip: Boolean(body.isVip),
      hasAudio: Boolean(body.hasAudio),
      aiIssue: body.aiSummary?.issue,
      aiLocation: body.aiSummary?.location,
      aiRequestedTime: body.aiSummary?.requestedTime,
      history: {
        create: [{ event: 'Lead Captured', statusBadge: 'captured' }],
      },
      chatMessages: body.firstMessage
        ? { create: [{ sender: 'system', text: body.firstMessage }] }
        : undefined,
    },
    include: {
      history: { orderBy: { createdAt: 'asc' } },
      chatMessages: { orderBy: { createdAt: 'asc' } },
    },
  });

  return NextResponse.json({ lead: serializeLead(lead) });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get('org_id')?.value;

  if (!orgIdCookie) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 401 });
  }

  const organizationId = await resolveOrganizationId(orgIdCookie);
  const body = await request.json();
  const { id, historyEvent, historyBadge, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
  }

  const allowed = [
    'status', 'closedValue', 'unrepliedMinutes', 'isPinned', 'isSnoozed', 'snoozeUntil',
    'dispatchNote', 'assignedTechId',
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) data[key] = fields[key];
  }
  if ('scheduledAt' in fields) {
    data.scheduledAt = fields.scheduledAt ? new Date(fields.scheduledAt as string) : null;
  }
  if (historyEvent) {
    data.history = { create: [{ event: historyEvent, statusBadge: historyBadge || '' }] };
  }

  const lead = await prisma.portalLead.update({
    where: { id, organizationId },
    data,
    include: {
      history: { orderBy: { createdAt: 'asc' } },
      chatMessages: { orderBy: { createdAt: 'asc' } },
    },
  });

  return NextResponse.json({ lead: serializeLead(lead) });
}
