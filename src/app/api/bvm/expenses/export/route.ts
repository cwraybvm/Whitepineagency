import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { IRS_MILEAGE_RATE } from '@/lib/bvmTargets';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

function csvField(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function csvRow(vals: (string | number)[]): string {
  return vals.map(csvField).join(',');
}

// 📥 GET: tax-year CSV export -- ?range=ytd|month|custom, ?month=YYYY-MM for
// range=month (defaults current month), ?start=&end= (YYYY-MM-DD) for
// range=custom.
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'ytd';

  const now = new Date();
  let start: Date;
  let end: Date;

  if (range === 'month') {
    const month = searchParams.get('month') || now.toISOString().slice(0, 7);
    start = new Date(`${month}-01T00:00:00.000Z`);
    end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else if (range === 'custom') {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) {
      return NextResponse.json({ error: 'Custom range requires start and end' }, { status: 400 });
    }
    start = new Date(`${startParam}T00:00:00.000Z`);
    end = new Date(`${endParam}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1); // end date is inclusive
  } else {
    // "Year to date" means through today, not the full calendar year.
    start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  }

  const expenses = await prisma.expense.findMany({
    where: { organizationId: null, date: { gte: start, lt: end } },
    include: { appointment: { select: { clientName: true, date: true } } },
    orderBy: { date: 'asc' },
  });

  const mileageRows = expenses.filter((e) => e.type === 'MILEAGE');
  const directRows = expenses.filter((e) => e.type !== 'MILEAGE');
  const totalMiles = mileageRows.reduce((sum, e) => sum + (e.miles || 0), 0);
  const totalMileageDeduction = mileageRows.reduce((sum, e) => sum + e.amount, 0);
  const totalDirectExpenses = directRows.reduce((sum, e) => sum + e.amount, 0);
  const totalCombined = totalMileageDeduction + totalDirectExpenses;

  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);

  const lines = [
    csvRow(['BVM Business Expense Tax Summary']),
    csvRow(['Range:', `${startStr} to ${endStr}`]),
    csvRow(['Total Miles Driven:', totalMiles.toFixed(1)]),
    csvRow(['Total Mileage Deduction:', `$${totalMileageDeduction.toFixed(2)}`]),
    csvRow(['Total Direct Expenses:', `$${totalDirectExpenses.toFixed(2)}`]),
    csvRow(['Total Combined Deduction:', `$${totalCombined.toFixed(2)}`]),
    '',
    csvRow(['Date', 'Category', 'Description / Client Name', 'Distance (Miles)', 'IRS Rate', 'Amount ($)', 'Receipt Attached (Yes/No)', 'Appointment Linked']),
    ...expenses.map((e) =>
      csvRow([
        e.date.toISOString().slice(0, 10),
        e.category,
        e.appointment?.clientName || e.description || '',
        e.type === 'MILEAGE' && e.miles != null ? e.miles.toFixed(1) : '',
        e.type === 'MILEAGE' ? `$${IRS_MILEAGE_RATE.toFixed(2)}` : '',
        e.amount.toFixed(2),
        e.receiptUrl ? 'Yes' : 'No',
        e.appointment ? `${e.appointment.clientName} (${e.appointment.date.toISOString().slice(0, 10)})` : '',
      ])
    ),
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bvm-expense-tax-summary-${startStr}-to-${endStr}.csv"`,
    },
  });
}
