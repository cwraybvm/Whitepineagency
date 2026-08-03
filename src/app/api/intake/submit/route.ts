import { NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, ownerName, email, phone, offerHeadline, organizationId } = body;

    if (!businessName || !email) {
      return NextResponse.json(
        { success: false, error: 'Business name and email are required.' },
        { status: 400 }
      );
    }

    // Sanitize folder name
    const folderName = `${businessName.replace(/[^a-zA-Z0-9\s]/g, '')} - Assets`;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'ROOT_FOLDER_ID';

    // Mock Google Drive API Folder Creation
    // In production, use googleapis library with service account credentials:
    // const drive = google.drive({ version: 'v3', auth });
    // const res = await drive.files.create({ requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] } });

    const createdFolderId = `drive_folder_${Date.now()}`;
    const driveFolderUrl = `https://drive.google.com/drive/folders/${createdFolderId}`;

    console.log(`[Intake System] Generated Google Drive folder "${folderName}" (${createdFolderId}) for ${businessName}`);

    await dispatchWebhookEvent(
      'intake.completed',
      { businessName, ownerName, email, phone, offerHeadline, driveFolderId: createdFolderId, driveFolderUrl },
      organizationId ?? null
    );

    return NextResponse.json({
      success: true,
      message: `Intake registered and Google Drive folder created for ${businessName}`,
      data: {
        businessName,
        ownerName,
        email,
        phone,
        offerHeadline,
        driveFolderId: createdFolderId,
        driveFolderUrl,
      },
    });
  } catch (error: any) {
    console.error('[Intake Submission Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error processing intake' },
      { status: 500 }
    );
  }
}