import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';

const INTAKE_SLA_HOURS = 48;

const INTAKE_CHECKLIST = [
  'Verify Logo Resolution',
  'Configure Twilio Forwarding',
  'Deploy Review Pass',
];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientName = (formData.get('clientName') as string) || 'New Client';
    const offerDetails = (formData.get('offerDetails') as string) || '';
    const files = formData.getAll('files') as File[];

    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    // 1. Create a dedicated folder for this client inside Google Drive
    const folderMetadata = {
      name: `${clientName} - ${new Date().toLocaleDateString('en-US')}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : [],
    };

    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, webViewLink',
    });

    const clientFolderId = folderResponse.data.id;
    const folderViewLink = folderResponse.data.webViewLink;

    // 2. Upload all files into the new client folder
    const uploadedFileIds = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = {
        name: file.name,
        parents: [clientFolderId!],
      };

      const media = {
        mimeType: file.type,
        body: stream,
      };

      const fileUpload = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      uploadedFileIds.push(fileUpload.data.id);
    }

    // 3. Drive upload succeeded — the client's assets are safe. Creating the
    // fulfillment task is a secondary automation from here, so a DB failure
    // must not turn a successful upload into an error response for the user.
    try {
      const now = new Date();
      await prisma.fulfillmentTask.create({
        data: {
          title: 'New Client Asset Intake',
          clientName,
          status: 'Intake Pending',
          driveFolderUrl: folderViewLink,
          offerHeadline: offerDetails || undefined,
          stageEnteredAt: now,
          slaDeadline: new Date(now.getTime() + INTAKE_SLA_HOURS * 60 * 60 * 1000),
          checklist: {
            create: INTAKE_CHECKLIST.map((label, idx) => ({ label, orderPosition: idx })),
          },
          intakeAssets: {
            create: [{ clientName, offerDetails: offerDetails || undefined, driveFolderUrl: folderViewLink, fileCount: uploadedFileIds.length }],
          },
        },
      });
    } catch (dbError) {
      console.error('Fulfillment task creation failed (Drive upload still succeeded):', dbError);
    }

    return NextResponse.json({
      success: true,
      folderId: clientFolderId,
      folderUrl: folderViewLink,
      uploadedCount: uploadedFileIds.length,
    });
  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}