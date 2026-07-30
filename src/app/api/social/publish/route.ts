import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { platform, content, webhookUrl, clientName } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content payload is required' }, { status: 400 });
    }

    const targetWebhook = webhookUrl || process.env.SOCIAL_PUBLISH_WEBHOOK_URL;

    if (!targetWebhook) {
      return NextResponse.json(
        { error: 'No social webhook URL configured in environment or API Vault.' },
        { status: 400 }
      );
    }

    const response = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        platform,
        content,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook endpoint returned status ${response.status}`);
    }

    return NextResponse.json({ success: true, message: `Published to ${platform}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Publishing failed' }, { status: 500 });
  }
}