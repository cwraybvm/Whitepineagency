import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { wpUrl, wpUsername, wpAppPassword, title, content } = await req.json();

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      return NextResponse.json({ error: 'Missing WordPress API Credentials' }, { status: 400 });
    }

    const cleanUrl = wpUrl.replace(/\/$/, '');
    const authHeader = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

    const res = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`
      },
      body: JSON.stringify({
        title,
        content,
        status: 'draft' // Posts as a draft in wp-admin for review
      })
    });

    const postData = await res.json();

    if (!res.ok) {
      throw new Error(postData.message || 'WordPress REST API error');
    }

    return NextResponse.json({ success: true, postUrl: postData.link });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}