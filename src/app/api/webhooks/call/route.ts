import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Twilio sends x-www-form-urlencoded data
    const formData = await request.formData();
    
    const callerNumber = formData.get('From') as string;
    const twilioNumber = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string; // 'no-answer', 'busy', 'completed'

    console.log(`[Twilio Webhook] Incoming call from ${callerNumber} to ${twilioNumber}. Status: ${callStatus}`);

    // Trigger auto text-back if the call was missed or went to voicemail
    if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'canceled') {
      const autoTextPayload = {
        to: callerNumber,
        from: twilioNumber,
        body: `Hi there! Thanks for calling. Sorry we missed you—our team is currently assisting other customers. How can we help you out today?`,
      };

      // Here you would integrate Twilio REST API client:
      // await twilioClient.messages.create(autoTextPayload);

      return NextResponse.json({
        success: true,
        message: 'Missed call detected. Instant text-back triggered.',
        data: autoTextPayload,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Call completed normally. No auto-responder required.',
    });
  } catch (error: any) {
    console.error('[Twilio Webhook Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}