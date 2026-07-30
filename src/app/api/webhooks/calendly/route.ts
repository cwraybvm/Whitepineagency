import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 Incoming Calendly Webhook Broadcast:", JSON.stringify(body));

    // Ensure this is an invitee booking creation event
    if (body.event !== 'invitee.created') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const inviteeEmail = body.payload?.email;
    if (!inviteeEmail) {
      return NextResponse.json({ error: 'Payload missing profile email target' }, { status: 400 });
    }

    // 🏎️ Normalize casing to prevent database lookups from skipping matched rows
    const normalizedEmail = inviteeEmail.trim().toLowerCase();
    console.log(`Targeting CRM automation alignment for: ${normalizedEmail}`);

    // 1. Locate the User tracking mapping and include their multi-tenant memberships
    const trackingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        members: true, 
      },
    });

    const primaryMembership = trackingUser?.members[0];

    // Verify both the user and their active membership link exist
    if (!trackingUser || !primaryMembership) {
      console.log(`⚠️ No active user workspace found in PostgreSQL maps for email: ${normalizedEmail}`);
      return NextResponse.json({ message: 'Webhook processed, no local entity matched.' }, { status: 200 });
    }

    const targetOrganizationId = primaryMembership.organizationId;

    // 2. Advance the Organization status to ACTIVE/BOOKED configuration context
    await db.organization.update({
      where: { id: targetOrganizationId },
      data: { status: 'ACTIVE' }, // Aligns with your Prisma Schema valid Enum values
    });

    console.log(`🎉 Success! Advanced Organization ID ${targetOrganizationId} to status context.`);
    return NextResponse.json({ success: true, message: 'Funnel tracking stage advanced.' });

  } catch (error) {
    console.error("❌ Webhook pipeline crash:", error);
    return NextResponse.json({ error: 'Internal pipeline transaction error' }, { status: 500 });
  }
}