import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey, listId, subject, htmlContent, fromName, replyTo } = await req.json();

    if (!apiKey || !listId) {
      return NextResponse.json({ error: 'Missing Mailchimp configuration credentials.' }, { status: 400 });
    }

    const dc = apiKey.split('-')[1]; // e.g., us19, us20
    const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

    // 1. Create the Mailchimp Campaign Container
    const campaignRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'regular',
        recipients: { list_id: listId },
        settings: {
          subject_line: subject,
          title: subject,
          from_name: fromName || 'TRK Ministries',
          reply_to: replyTo || 'contact@trkministries.org'
        }
      })
    });

    const campaign = await campaignRes.json();

    if (!campaignRes.ok) {
      throw new Error(campaign.detail || 'Mailchimp campaign creation failed');
    }

    // 2. Set the HTML Content inside the newly created campaign
    await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns/${campaign.id}/content`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ html: htmlContent })
    });

    return NextResponse.json({ success: true, campaignId: campaign.id, webId: campaign.web_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}