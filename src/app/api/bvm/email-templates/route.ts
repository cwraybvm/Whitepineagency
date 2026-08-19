import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { DEFAULT_BVM_EMAIL_TEMPLATES } from '@/lib/bvmEmailTemplates';

export const dynamic = 'force-dynamic';

async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

// 📋 GET: list all templates, seeding the 3 BVM defaults on first load
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await prisma.bvmEmailTemplate.count();
  if (count === 0) {
    await prisma.bvmEmailTemplate.createMany({ data: DEFAULT_BVM_EMAIL_TEMPLATES.map((t) => ({ ...t })) });
  }

  const templates = await prisma.bvmEmailTemplate.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  return NextResponse.json(templates);
}

// ➕ POST: create a new template
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, subject, body, category } = await request.json();
    if (!name || !subject || !body || !category) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
    }

    const template = await prisma.bvmEmailTemplate.create({ data: { name, subject, body, category } });
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    console.error('BVM email template POST failed:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// 🔄 PATCH: edit an existing template
export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, subject, body, category } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (subject !== undefined) data.subject = subject;
    if (body !== undefined) data.body = body;
    if (category !== undefined) data.category = category;

    const template = await prisma.bvmEmailTemplate.update({ where: { id }, data });
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('BVM email template PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// 🗑️ DELETE: remove a template
export async function DELETE(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  try {
    await prisma.bvmEmailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BVM email template DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
