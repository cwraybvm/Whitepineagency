import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '@/lib/prisma';

// ⚡ Force dynamic execution so Next.js doesn't try to evaluate Gemini API key statically during build
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const { sourceNotes, clientName, organizationId = 'default-org' } = await req.json();

    if (!sourceNotes) {
      return NextResponse.json({ error: 'Source notes are required' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an elite content strategist and social media director for ${clientName || 'TRK Ministries'}.
      Transform the provided sermon notes, teaching bullet points, or transcript into a complete multi-channel release pack:

      SOURCE CONTENT:
      ${sourceNotes}`,
      config: {
        systemInstruction: `Generate a structured content pack containing:
        1. blogMarkdown: A full, engaging blog article formatted in clean Markdown with headers.
        2. emailDraft: A warm, compelling email newsletter draft ready for Mailchimp.
        3. reelScript: A 45-second script with timestamps ([0:00 - HOOK], [0:15 - BODY], [0:35 - CTA]).
        4. instagramCaption: Engaging IG caption with emojis, CTA, and 10 relevant hashtags.
        5. twitterThread: Array of 3-5 tweets structured as an engaging thread.
        6. linkedinPost: A professional text post formatted for LinkedIn with spacing.
        7. imagePrompt: Detailed AI prompt for Midjourney/DALL-E to generate matching post graphics.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            blogMarkdown: { type: Type.STRING },
            emailDraft: { type: Type.STRING },
            reelScript: { type: Type.STRING },
            instagramCaption: { type: Type.STRING },
            twitterThread: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            linkedinPost: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: [
            'blogMarkdown',
            'emailDraft',
            'reelScript',
            'instagramCaption',
            'twitterThread',
            'linkedinPost',
            'imagePrompt',
          ],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedContent = JSON.parse(responseText);

    // Persist generated pack to Database as a Content Post Draft
    const savedPost = await prisma.contentPost.create({
      data: {
        organizationId,
        title: `Release Pack: ${new Date().toLocaleDateString()}`,
        status: 'DRAFT',
        content: parsedContent.blogMarkdown, // Store main blog in content field
        instagramCaption: parsedContent.instagramCaption,
        twitterThread: JSON.stringify(parsedContent.twitterThread),
        linkedinPost: parsedContent.linkedinPost,
        reelScript: parsedContent.reelScript,
        imagePrompt: parsedContent.imagePrompt,
      },
    }).catch(() => null);

    return NextResponse.json({
      ...parsedContent,
      postId: savedPost?.id || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gemini Generation Failed' }, { status: 500 });
  }
}