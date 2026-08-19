import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 📅 GET: ?date=X for a single day (zeroed default when nothing saved yet),
// or ?start=&end= for a raw row range (weekly report / "this week" chips).
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (start && end) {
    const logs = await prisma.consistentDisciplineLog.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(logs);
  }

  const date = searchParams.get('date') || todayStr();
  const log = await prisma.consistentDisciplineLog.findUnique({ where: { date } });
  if (log) return NextResponse.json(log);

  return NextResponse.json({
    id: null,
    date,
    pagesRead: 0,
    jiuJitsu: false,
    workout: false,
    waterGlasses: 0,
    notes: null,
  });
}

// 💾 POST/PATCH: partial-update daily upsert (same handler, spec allows either verb)
async function upsert(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date, pagesRead, jiuJitsu, workout, waterGlasses, notes } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (pagesRead !== undefined) data.pagesRead = pagesRead;
    if (jiuJitsu !== undefined) data.jiuJitsu = jiuJitsu;
    if (workout !== undefined) data.workout = workout;
    if (waterGlasses !== undefined) data.waterGlasses = waterGlasses;
    if (notes !== undefined) data.notes = notes;

    const log = await prisma.consistentDisciplineLog.upsert({
      where: { date },
      create: { date, ...data },
      update: data,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Consistent Discipline upsert failed:', error);
    return NextResponse.json({ error: 'Failed to save discipline log' }, { status: 500 });
  }
}

export const POST = upsert;
export const PATCH = upsert;
