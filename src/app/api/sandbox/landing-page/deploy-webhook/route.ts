import { NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { validateDeployWebhookInput } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateDeployWebhookInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { organizationId, title, html, metadata } = body;

    const result = await dispatchWebhookEvent(
      'landing_page.exported',
      { title, html, metadata },
      organizationId,
    );

    return NextResponse.json({ success: true, delivered: result.delivered });
  } catch (err: any) {
    console.error('Sandbox landing-page deploy-webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook deploy failed' }, { status: 500 });
  }
}
