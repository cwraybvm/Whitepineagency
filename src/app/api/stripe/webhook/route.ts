import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.type;

    // Handle Subscription Created or Updated
    if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      const sub = body.data.object;
      const customerId = sub.customer;
      const subscriptionId = sub.id;
      const status = sub.status.toUpperCase(); // ACTIVE, PAST_DUE, CANCELED

      // Find organization linked to this customer
      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (org) {
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          update: {
            status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          create: {
            organizationId: org.id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            planName: sub.items?.data[0]?.price?.nickname || 'Agency Retainer',
            amount: (sub.items?.data[0]?.price?.unit_amount || 0) / 100,
            status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });

        // Update Organization Status
        await prisma.organization.update({
          where: { id: org.id },
          data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook failed' }, { status: 500 });
  }
}