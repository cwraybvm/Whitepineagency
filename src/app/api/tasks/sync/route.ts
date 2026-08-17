import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ColumnSyncPayload {
  columnId: string;
  cardIds: string[];
}

export async function POST(req: Request) {
  try {
    const { organizationId, columnUpdates } = await req.json() as {
      organizationId: string;
      columnUpdates: ColumnSyncPayload[];
    };

    if (!organizationId || !columnUpdates) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updateOperations = columnUpdates.flatMap(({ columnId, cardIds }) =>
      cardIds.map((cardId, index) =>
        prisma.taskCard.update({
          where: { id: cardId },
          data: {
            columnId,
            orderPosition: index,
          },
        })
      )
    );

    await prisma.$transaction(updateOperations);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync board state' }, { status: 500 });
  }
}