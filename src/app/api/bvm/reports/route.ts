import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { BVM_STATUS_OPTIONS } from '@/lib/bvmStatus';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

interface CellDatum {
  cellNumber: number;
  status: string | null;
}

// 📊 GET: aggregate call-consistency, conference attendance, and new-address
// metrics over a daily/weekly/monthly/yearly window anchored on ?date=.
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'monthly'; // daily, weekly, monthly, yearly
  const anchor = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const anchorDate = new Date(`${anchor}T00:00:00.000Z`);
  const start = new Date(anchorDate);
  const end = new Date(anchorDate);
  end.setUTCDate(end.getUTCDate() + 1);

  if (range === 'weekly') {
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (range === 'monthly') {
    start.setUTCDate(1);
    end.setTime(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else if (range === 'yearly') {
    start.setUTCMonth(0, 1);
    end.setTime(start.getTime());
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  }

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [callLogs, conferenceCalls, addresses, appointments] = await Promise.all([
    prisma.bvmCallLog.findMany({ where: { date: { gte: startStr, lt: endStr } } }),
    prisma.bvmConferenceCall.findMany({ where: { date: { gte: startStr, lt: endStr } } }),
    prisma.bvmAddress.findMany({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.bvmAppointment.findMany({ where: { date: { gte: start, lt: end } } }),
  ]);

  const statusCounts: Record<string, number> = Object.fromEntries(BVM_STATUS_OPTIONS.map((o) => [o.value, 0]));
  let totalCalls = 0;
  let leadsAddedTotal = 0;

  for (const log of callLogs) {
    const cells = (log.cellData as unknown as CellDatum[]) || [];
    for (const cell of cells) {
      if (cell.status && statusCounts[cell.status] !== undefined) {
        statusCounts[cell.status]++;
        totalCalls++;
      }
    }
    leadsAddedTotal += log.leadsAdded;
  }

  const leadCallConversionRate = totalCalls > 0 ? Math.round((leadsAddedTotal / totalCalls) * 100) : 0;

  const attendedCount = conferenceCalls.filter((c) => c.attended).length;
  const attendanceRate = conferenceCalls.length ? Math.round((attendedCount / conferenceCalls.length) * 100) : 0;
  const addressesSent = addresses.filter((a) => a.sentToBvm).length;

  // Conversion funnel: total calls -> connects (Yes/LMGK) -> appointments
  // scheduled -> closed deals (outcome contains "closed", e.g. "Closed - Won").
  const connects = statusCounts.Yes + statusCounts.LMGK;
  const appointmentsScheduled = appointments.length;
  const closedDeals = appointments.filter((a) => a.outcome.toLowerCase().includes('closed')).length;

  return NextResponse.json({
    range,
    startDate: startStr,
    endDate: end.toISOString().slice(0, 10),
    totalCalls,
    statusCounts,
    leadsAddedTotal,
    leadCallConversionRate,
    conferenceCallCount: conferenceCalls.length,
    conferenceAttendedCount: attendedCount,
    conferenceAttendanceRate: attendanceRate,
    newAddressesTotal: addresses.length,
    newAddressesSentToBvm: addressesSent,
    funnel: {
      totalCalls,
      connects,
      appointmentsScheduled,
      closedDeals,
    },
  });
}
