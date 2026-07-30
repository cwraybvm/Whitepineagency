import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { businessName, url } = await request.json();

    // To link this to your phone, create a Discord server, go to Channel Settings -> Integrations -> Webhooks,
    // and copy the Webhook URL. Add it to your .env.local and Vercel variables as NOTIFICATION_WEBHOOK_URL.
    const WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;

    const alertMessage = {
      content: `🚨 **[CLIENT ACTIVE]** *${businessName || "A prospect"}* is viewing their live Digital Health Report right now!\n🔗 Web Address: ${url}`,
    };

    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertMessage),
      });
    } else {
      console.log("📡 SERVER ALERT LOG:", alertMessage.content);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert webhook failed:", error);
    return NextResponse.json({ error: "Failed to broadcast alert" }, { status: 500 });
  }
}
