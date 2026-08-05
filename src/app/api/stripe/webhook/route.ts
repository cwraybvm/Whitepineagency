import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { pushToCrmWebhook } from '@/lib/crmSync';

export const dynamic = 'force-dynamic';

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'new-client';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const clientName = metadata.clientName || session.customer_details?.name || 'New Client';
  const email = metadata.email || session.customer_details?.email || '';
  const planName = metadata.planName || 'Growth Retainer';
  const primaryColor = metadata.primaryColor || null;
  const customDomain = metadata.customDomain || null;
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;

  // Idempotent across Stripe's automatic retries: re-resolve the same org by
  // customer id (if we have one) or by the deterministic slug below, rather
  // than blindly creating a new row each delivery attempt.
  const existing =
    (stripeCustomerId && (await prisma.organization.findFirst({ where: { stripeCustomerId } }))) || null;
  const slug = existing?.slug ?? `${slugify(clientName)}-${session.id.slice(-8)}`;

  const organization = await prisma.organization.upsert({
    where: { slug },
    create: {
      name: clientName,
      slug,
      status: 'ACTIVE',
      primaryColor,
      customDomain,
      stripeCustomerId,
    },
    update: {
      status: 'ACTIVE',
      ...(primaryColor && { primaryColor }),
      ...(customDomain && { customDomain }),
      ...(stripeCustomerId && { stripeCustomerId }),
    },
  });

  // Only the first provisioning pass creates the onboarding task — a retried
  // webhook delivery for the same session must not spawn duplicates.
  if (!existing) {
    await prisma.fulfillmentTask.create({
      data: {
        title: `${planName} — New Client Onboarding`,
        clientName,
        status: 'Intake Pending',
        organizationId: organization.id,
        contactEmail: email || 'N/A',
        offerHeadline: planName,
      },
    });
  }

  await pushToCrmWebhook({
    event: 'payment.received',
    organizationId: organization.id,
    clientName,
    email,
    planName,
    amountTotal: session.amount_total != null ? session.amount_total / 100 : undefined,
  });
}

async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const status = sub.status.toUpperCase();

  const org = await prisma.organization.findFirst({ where: { stripeCustomerId: customerId } });
  if (!org) return;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      status,
      currentPeriodEnd: new Date(sub.items.data[0]?.current_period_end * 1000),
    },
    create: {
      organizationId: org.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      planName: sub.items.data[0]?.price?.nickname || 'Agency Retainer',
      amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
      status,
      currentPeriodEnd: new Date(sub.items.data[0]?.current_period_end * 1000),
    },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' },
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !apiKey) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  const stripe = new Stripe(apiKey, { typescript: true });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Stripe webhook handler failed for "${event.type}":`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
