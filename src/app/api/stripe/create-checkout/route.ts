import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    // Runtime guard: Block payment attempts if key is missing in production environment
    if (!apiKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not configured in environment variables.' },
        { status: 500 }
      );
    }

    // Always pass a valid string format to Stripe constructor so build-time evaluation never throws
    const stripe = new Stripe(apiKey || 'sk_test_build_placeholder', {
      typescript: true,
    });

    const { amount, currency = 'usd', clientName } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Agency Retainer / Service: ${clientName || 'White Pine Agency'}`,
            },
            unit_amount: amount, // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/portal?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/portal?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Checkout creation failed' }, { status: 500 });
  }
}