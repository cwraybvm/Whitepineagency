import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Extract the secure incoming application payload
    const body = await request.json();
    const { name, phone, lead_source, message } = body;

    // 2. Perform validation checks on core string data variables
    if (!name || !phone || !lead_source) {
      return NextResponse.json(
        { success: false, error: "Missing required core strings fields fields: name, phone, or lead_source" },
        { status: 400 }
      );
    }

    // ==========================================================================
    // FUTURE HOOK PLACEHOLDER PIPELINE
    // Here is where the incoming webhook payload will eventually connect to 
    // trigger live notification logs on our dashboard engine.
    // E.g., await db.lead.create({ data: { name, phone, lead_source, message } });
    // ==========================================================================
    console.log("Valid Inbound Audit Payload Intercepted Cleanly:", { name, phone, lead_source, message });

    // 3. Dispatch validation acknowledgment status code
    return NextResponse.json({ 
      success: true, 
      message: "Lead framework metrics parsed successfully",
      captured: { name, lead_source }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON transmission structure payload" },
      { status: 500 }
    );
  }
}