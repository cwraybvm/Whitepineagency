import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { postId, webhookUrl } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // Fetch the post and organization details
    const post = await prisma.contentPost.findUnique({
      where: { id: postId },
      include: { organization: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { organization } = post;
    const publishedPlatforms: string[] = [];
    const errors: string[] = [];

    // 1. Meta (Facebook / Instagram) Direct Posting
    if (post.platforms.includes('INSTAGRAM') || post.platforms.includes('FACEBOOK')) {
      if (organization.metaPageAccessToken && organization.metaPageId) {
        try {
          const metaRes = await fetch(
            `https://graph.facebook.com/v19.0/${organization.metaPageId}/feed`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: post.instagramCaption || post.content || post.title,
                access_token: organization.metaPageAccessToken,
              }),
            }
          );
          if (metaRes.ok) publishedPlatforms.push('META');
          else errors.push('Meta posting failed');
        } catch (e: any) {
          errors.push(`Meta error: ${e.message}`);
        }
      }
    }

    // 2. LinkedIn Direct Posting
    if (post.platforms.includes('LINKEDIN')) {
      if (organization.linkedInAccessToken && organization.linkedInAuthorUrn) {
        try {
          const linkedInRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${organization.linkedInAccessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author: organization.linkedInAuthorUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: post.linkedinPost || post.content || post.title },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
            }),
          });
          if (linkedInRes.ok) publishedPlatforms.push('LINKEDIN');
          else errors.push('LinkedIn posting failed');
        } catch (e: any) {
          errors.push(`LinkedIn error: ${e.message}`);
        }
      }
    }

    // 3. Webhook Fallback (Zapier / Make / N8N) if no direct integration was triggered
    const targetWebhook = webhookUrl || process.env.SOCIAL_PUBLISH_WEBHOOK_URL;
    if (publishedPlatforms.length === 0 && targetWebhook) {
      const webhookRes = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          clientName: organization.name,
          platforms: post.platforms,
          title: post.title,
          content: post.content,
          instagramCaption: post.instagramCaption,
          linkedinPost: post.linkedinPost,
          mediaUrl: post.mediaUrl,
          timestamp: new Date().toISOString(),
        }),
      });

      if (webhookRes.ok) {
        publishedPlatforms.push('WEBHOOK');
      } else {
        errors.push(`Webhook returned status ${webhookRes.status}`);
      }
    }

    // Determine final status
    const isSuccess = publishedPlatforms.length > 0;
    const updatedPost = await prisma.contentPost.update({
      where: { id: postId },
      data: {
        status: isSuccess ? 'PUBLISHED' : 'FAILED',
        publishedAt: isSuccess ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: isSuccess,
      post: updatedPost,
      publishedPlatforms,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Publishing failed' }, { status: 500 });
  }
}