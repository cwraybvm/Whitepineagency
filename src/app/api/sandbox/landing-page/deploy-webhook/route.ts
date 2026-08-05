import { NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export function validateDeployWebhookInput(body: any): string | null {
  if (!body || typeof body.organizationId !== 'string' || !body.organizationId.trim()) {
    return 'organizationId is required';
  }
  if (typeof body.title !== 'string' || !body.title.trim()) return 'title is required';
  if (typeof body.html !== 'string' || !body.html.trim()) return 'html is required';
  return null;
}

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
