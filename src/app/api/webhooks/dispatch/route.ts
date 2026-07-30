import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetWebhookUrl = body.targetUrl || process.env.MAKE_WEBHOOK_URL;

    if (!targetWebhookUrl) {
      return NextResponse.json({ error: 'No automation target URL provided or configured in .env' }, { status: 400 });
    }

    const response = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: body.event,
        timestamp: new Date().toISOString(),
        agency: 'White Pine Control Portal',
        client: 'Apex Mechanical Services',
        payload: body.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Automation server rejected dispatch with status ${response.status}`);
    }

    return NextResponse.json({ success: true, status: 'dispatched' });
  } catch (error: any) {
    console.error('Webhook Dispatch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}