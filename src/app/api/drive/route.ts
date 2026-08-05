import { NextRequest, NextResponse, after } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { pushToCrmWebhook } from '@/lib/crmSync';

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
    const websiteUrl = (formData.get('websiteUrl') as string) || '';
    const location = (formData.get('location') as string) || '';
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
    let intakeAssetId: string | undefined;
    try {
      const now = new Date();
      const fulfillmentTask = await prisma.fulfillmentTask.create({
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
        include: { intakeAssets: true },
      });
      intakeAssetId = fulfillmentTask.intakeAssets[0]?.id;
    } catch (dbError) {
      console.error('Fulfillment task creation failed (Drive upload still succeeded):', dbError);
    }

    // 4. Notify the CRM immediately so a rep can follow up without waiting on
    // the slower AI enrichment below. Brand DNA extraction + campaign
    // generation are offloaded to the intake-processor worker via `after()`
    // so they run post-response and don't hold up this upload request; that
    // worker pushes its own CRM event once it has brandDna/campaignPackage.
    await pushToCrmWebhook({
      event: 'intake.received',
      clientName,
      offerDetails,
      folderUrl: folderViewLink,
    });

    if (websiteUrl || (location && offerDetails)) {
      const workerUrl = new URL('/api/workers/intake-processor', req.url);
      after(() =>
        fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName, websiteUrl, location, offerDetails, intakeAssetId }),
        }).catch((error) => console.error('Intake worker dispatch failed:', error))
      );
    }

    return NextResponse.json({
      success: true,
      folderId: clientFolderId,
      folderUrl: folderViewLink,
      portalUrl: new URL('/admin', req.url).toString(),
      uploadedCount: uploadedFileIds.length,
    });
  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}