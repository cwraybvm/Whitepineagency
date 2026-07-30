import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Create a new task card
export async function POST(req: Request) {
  try {
    const {
      organizationId,
      columnId,
      title,
      description,
      assignee,
      dueDate,
      tagLabel,
      tagColor,
    } = await req.json();

    if (!organizationId || !columnId || !title) {
      return NextResponse.json(
        { error: 'Organization ID, Column ID, and Title are required' },
        { status: 400 }
      );
    }

    // Get current card count in this column to calculate order position
    const cardCount = await prisma.taskCard.count({
      where: { columnId },
    });

    const card = await prisma.taskCard.create({
      data: {
        organizationId,
        columnId,
        title,
        description,
        assignee,
        dueDate,
        tagLabel: tagLabel || 'General',
        tagColor: tagColor || 'bg-white/10 text-gray-300 border-white/15',
        orderPosition: cardCount,
      },
    });

    return NextResponse.json({ success: true, card });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create card' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a card by ID
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get('cardId');

  if (!cardId) {
    return NextResponse.json(
      { error: 'Card ID is required' },
      { status: 400 }
    );
  }

  try {
    await prisma.taskCard.delete({
      where: { id: cardId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete card' },
      { status: 500 }
    );
  }
}