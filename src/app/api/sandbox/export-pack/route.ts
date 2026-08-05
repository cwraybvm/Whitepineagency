import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import type { Beat } from '@/components/sandbox/types';
import { buildCopyVariationsCsv, buildStoryboardMarkdown, buildReadme } from '@/lib/exportPack';

type ExportPackRequest = {
  organizationId?: string;
  organizationName?: string;
  campaignGoal?: string;
  targetAudience?: string;
  copyVariations: { angle: string; title: string; content: string }[];
  ad?: { title: string; content: string; metadata: { headline: string; cta: string } };
  video?: { title: string; content: string; metadata: { beats: Beat[] } };
};

async function fetchAudioBuffer(audioUrl: string): Promise<Buffer | null> {
  if (audioUrl.startsWith('data:')) {
    const base64 = audioUrl.split(',')[1] || '';
    return base64 ? Buffer.from(base64, 'base64') : null;
  }
  try {
    const res = await fetch(audioUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const { organizationName, campaignGoal, targetAudience, copyVariations, ad, video } = body as ExportPackRequest;

    if (!Array.isArray(copyVariations) || copyVariations.length === 0) {
      return NextResponse.json({ error: 'copyVariations must be a non-empty array' }, { status: 400 });
    }

    const zip = new JSZip();
    const notes: string[] = [];

    zip.file('copy-variations.json', JSON.stringify(copyVariations, null, 2));
    zip.file('copy-variations.csv', buildCopyVariationsCsv(copyVariations));

    if (video) {
      zip.file('storyboard-summary.md', buildStoryboardMarkdown(video));

      const beats = video.metadata?.beats || [];
      let audioFolder: JSZip | null = null;
      for (let i = 0; i < beats.length; i++) {
        const audioUrl = beats[i].audioUrl;
        if (!audioUrl) continue;
        const buffer = await fetchAudioBuffer(audioUrl);
        if (buffer) {
          if (!audioFolder) audioFolder = zip.folder('voiceover-audio')!;
          const ext = audioUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
          audioFolder.file(`scene-${i + 1}.${ext}`, buffer);
        } else {
          notes.push(`Scene ${i + 1} voiceover unavailable — audioUrl fetch failed, see manifest link: ${audioUrl}`);
        }
      }
    }

    zip.file(
      'README.txt',
      buildReadme({ organizationName, campaignGoal, targetAudience, ad, notes, generatedAt: new Date().toISOString() })
    );

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="campaign-pack-${timestamp}.zip"`,
      },
    });
  } catch (err: any) {
    console.error('Sandbox export-pack error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
