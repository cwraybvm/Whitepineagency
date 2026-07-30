'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Globe,
  Mail,
  Video,
  Share2 as Instagram, // Aliased to generic share icons for guaranteed compilation
  Share2 as Twitter,
  Share2 as Linkedin,
  Image as ImageIcon,
  Send,
  Copy,
  Check,
  Loader2,
  ThumbsUp,
} from 'lucide-react';

interface ContentStudioProps {
  clientName: string;
  organizationId?: string;
}

export default function ContentStudio({ clientName, organizationId = 'default-org' }: ContentStudioProps) {
  const [sourceNotes, setSourceNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishingWp, setIsPublishingWp] = useState(false);
  const [isPublishingMc, setIsPublishingMc] = useState(false);
  const [isPublishingSocial, setIsPublishingSocial] = useState<string | null>(null);

  // Content Outputs State
  const [generatedBlog, setGeneratedBlog] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [generatedReelScript, setGeneratedReelScript] = useState('');
  const [instagramCaption, setInstagramCaption] = useState('');
  const [twitterThread, setTwitterThread] = useState<string[]>([]);
  const [linkedinPost, setLinkedinPost] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'DRAFT' | 'APPROVED'>('DRAFT');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // API Vault Credentials
  const [creds, setCreds] = useState<{
    mailchimpApiKey?: string;
    mailchimpListId?: string;
    wordpressUrl?: string;
    wordpressUsername?: string;
    wordpressAppPass?: string;
  }>({});

  // Fetch Credentials on Load
  useEffect(() => {
    if (organizationId) {
      fetch(`/api/organizations/credentials?organizationId=${organizationId}`)
        .then((res) => res.json())
        .then((data) => setCreds(data || {}))
        .catch(() => {});
    }
  }, [organizationId]);

  // 1. Generate Full Multi-Channel Content Pack
  const handleGenerateAllContent = async () => {
    if (!sourceNotes.trim()) {
      toast.error('Please enter sermon notes or a transcript first.');
      return;
    }

    setIsGenerating(true);
    toast.info(`🤖 AI Assistant generating content pack for ${clientName}...`);

    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNotes, clientName, organizationId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate content');

      setGeneratedBlog(data.blogMarkdown || '');
      setGeneratedEmail(data.emailDraft || '');
      setGeneratedReelScript(data.reelScript || '');
      setInstagramCaption(data.instagramCaption || '');
      setTwitterThread(data.twitterThread || []);
      setLinkedinPost(data.linkedinPost || '');
      setImagePrompt(data.imagePrompt || '');
      setApprovalStatus('DRAFT');

      toast.success('✅ Multi-Channel Content Pack Generated!');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Publish to WordPress
  const handlePushToWordpress = async () => {
    if (!creds.wordpressUrl || !creds.wordpressUsername || !creds.wordpressAppPass) {
      toast.error('Missing WordPress Credentials in API Vault.');
      return;
    }

    setIsPublishingWp(true);
    try {
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wpUrl: creds.wordpressUrl,
          wpUsername: creds.wordpressUsername,
          wpAppPassword: creds.wordpressAppPass,
          title: `Weekly Message: ${new Date().toLocaleDateString()}`,
          content: generatedBlog,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish to WordPress');

      toast.success('✅ Draft created on WordPress!');
    } catch (err: any) {
      toast.error(`❌ WordPress Error: ${err.message}`);
    } finally {
      setIsPublishingWp(false);
    }
  };

  // 3. Draft Mailchimp Campaign
  const handleDraftMailchimp = async () => {
    if (!creds.mailchimpApiKey || !creds.mailchimpListId) {
      toast.error('Missing Mailchimp Keys in API Vault.');
      return;
    }

    setIsPublishingMc(true);
    try {
      const res = await fetch('/api/mailchimp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: creds.mailchimpApiKey,
          listId: creds.mailchimpListId,
          subject: `Weekly Update from ${clientName}`,
          htmlContent: `<div style="font-family: sans-serif; line-height: 1.6;">${generatedEmail.replace(/\n/g, '<br/>')}</div>`,
          fromName: clientName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Mailchimp campaign');

      toast.success('✅ Campaign created in Mailchimp!');
    } catch (err: any) {
      toast.error(`❌ Mailchimp Error: ${err.message}`);
    } finally {
      setIsPublishingMc(false);
    }
  };

  // 4. Publish Social Media via Webhook
  const handlePublishSocial = async (platform: string, content: any) => {
    setIsPublishingSocial(platform);
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, clientName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publishing failed');

      toast.success(`🚀 Dispatched to ${platform}!`);
    } catch (err: any) {
      toast.error(err.message || 'Social publishing error');
    } finally {
      setIsPublishingSocial(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const hasOutput = generatedBlog || instagramCaption || linkedinPost;

  return (
    <div className="bg-[#080E1A] border border-white/15 p-6 rounded-3xl space-y-6 font-mono text-xs shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-black uppercase text-[10px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Content Engine OS
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 font-sans">{clientName}</span>
          </div>
          <h2 className="text-lg font-black text-white font-sans mt-0.5">Multi-Channel Release Studio</h2>
        </div>

        <button
          onClick={handleGenerateAllContent}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold rounded-2xl cursor-pointer shadow-lg active:scale-95 transition-all uppercase text-[10px] flex items-center gap-1.5 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⚡ Generate Release Pack'}
        </button>
      </div>

      {/* Input Notes Area */}
      <div className="space-y-2">
        <label className="text-gray-300 font-bold block">Raw Teaching Notes / Sermon Audio Transcript:</label>
        <textarea
          rows={4}
          value={sourceNotes}
          onChange={(e) => setSourceNotes(e.target.value)}
          placeholder="Paste raw teaching notes, bullet points, or audio transcript here..."
          className="w-full bg-slate-900 border border-white/15 p-3.5 text-white rounded-2xl outline-none focus:border-purple-500 font-sans text-xs placeholder-gray-500 resize-none"
        />
      </div>

      {/* Approval Status Bar */}
      {hasOutput && (
        <div className="flex justify-between items-center bg-slate-900 border border-white/10 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Approval Status:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full uppercase text-[9px] ${
                approvalStatus === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {approvalStatus}
            </span>
          </div>

          <button
            onClick={() => {
              setApprovalStatus('APPROVED');
              toast.success('Release Pack Approved!');
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase flex items-center gap-1 cursor-pointer"
          >
            <ThumbsUp className="w-3 h-3" /> Approve Release Pack
          </button>
        </div>
      )}

      {/* Output Grid - Row 1: Long Form (WordPress, Mailchimp, Reel Script) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WordPress Card */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-indigo-300 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-indigo-400" /> WordPress Blog</span>
              {generatedBlog && (
                <button onClick={() => copyToClipboard(generatedBlog, 'wp')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'wp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-40 overflow-y-auto text-gray-300 font-sans text-[11px] whitespace-pre-wrap leading-relaxed">
              {generatedBlog || <span className="text-gray-600 italic">Generated blog article will appear here...</span>}
            </div>
          </div>
          <button
            onClick={handlePushToWordpress}
            disabled={!generatedBlog || isPublishingWp}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            {isPublishingWp ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Push Draft to WordPress ➔'}
          </button>
        </div>

        {/* Mailchimp Card */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-emerald-300 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-emerald-400" /> Mailchimp Email</span>
              {generatedEmail && (
                <button onClick={() => copyToClipboard(generatedEmail, 'mc')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'mc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-40 overflow-y-auto text-gray-300 font-sans text-[11px] whitespace-pre-wrap leading-relaxed">
              {generatedEmail || <span className="text-gray-600 italic">Generated email draft will appear here...</span>}
            </div>
          </div>
          <button
            onClick={handleDraftMailchimp}
            disabled={!generatedEmail || isPublishingMc}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            {isPublishingMc ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Mailchimp Blast ➔'}
          </button>
        </div>

        {/* Reel Script Card */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-purple-300 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-purple-400" /> Reel / Short Script</span>
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-40 overflow-y-auto text-gray-300 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
              {generatedReelScript || <span className="text-gray-600 italic">Generated video script will appear here...</span>}
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(generatedReelScript, 'reel')}
            disabled={!generatedReelScript}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all"
          >
            Copy Script 📋
          </button>
        </div>
      </div>

      {/* Output Grid - Row 2: Social Channels (Instagram, Twitter, LinkedIn, Image Prompt) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* Instagram / Facebook */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-pink-400 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Instagram className="w-4 h-4" /> Instagram</span>
              {instagramCaption && (
                <button onClick={() => copyToClipboard(instagramCaption, 'ig')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'ig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-36 overflow-y-auto text-gray-300 font-sans text-[11px] whitespace-pre-wrap leading-relaxed">
              {instagramCaption || <span className="text-gray-600 italic">IG Caption & Hashtags...</span>}
            </div>
          </div>
          <button
            onClick={() => handlePublishSocial('instagram', instagramCaption)}
            disabled={!instagramCaption || isPublishingSocial === 'instagram'}
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer flex items-center justify-center gap-1"
          >
            {isPublishingSocial === 'instagram' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Auto-Post IG</>}
          </button>
        </div>

        {/* Twitter / X Thread */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sky-400 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Twitter className="w-4 h-4" /> X Thread</span>
              {twitterThread.length > 0 && (
                <button onClick={() => copyToClipboard(twitterThread.join('\n\n---\n\n'), 'x')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'x' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-36 overflow-y-auto text-gray-300 font-sans text-[10px] space-y-1.5">
              {twitterThread.length > 0 ? (
                twitterThread.map((tweet, i) => (
                  <div key={i} className="border-b border-white/5 pb-1">
                    <span className="text-sky-400 font-bold">{i + 1}/ </span>{tweet}
                  </div>
                ))
              ) : (
                <span className="text-gray-600 italic">3-5 Tweet Thread...</span>
              )}
            </div>
          </div>
          <button
            onClick={() => handlePublishSocial('twitter', twitterThread)}
            disabled={twitterThread.length === 0 || isPublishingSocial === 'twitter'}
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer flex items-center justify-center gap-1"
          >
            {isPublishingSocial === 'twitter' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Post Thread</>}
          </button>
        </div>

        {/* LinkedIn */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-blue-400 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><Linkedin className="w-4 h-4" /> LinkedIn</span>
              {linkedinPost && (
                <button onClick={() => copyToClipboard(linkedinPost, 'li')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'li' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-36 overflow-y-auto text-gray-300 font-sans text-[11px] whitespace-pre-wrap leading-relaxed">
              {linkedinPost || <span className="text-gray-600 italic">LinkedIn post...</span>}
            </div>
          </div>
          <button
            onClick={() => handlePublishSocial('linkedin', linkedinPost)}
            disabled={!linkedinPost || isPublishingSocial === 'linkedin'}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer flex items-center justify-center gap-1"
          >
            {isPublishingSocial === 'linkedin' ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Post to LinkedIn</>}
          </button>
        </div>

        {/* AI Image Prompt */}
        <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-amber-400 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> AI Image Prompt</span>
              {imagePrompt && (
                <button onClick={() => copyToClipboard(imagePrompt, 'img')} className="text-gray-400 hover:text-white">
                  {copiedKey === 'img' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="bg-black/50 p-3 rounded-xl max-h-36 overflow-y-auto text-amber-200/90 font-mono text-[10px] leading-relaxed">
              {imagePrompt || <span className="text-gray-600 italic">Image prompt for Midjourney/DALL-E...</span>}
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(imagePrompt, 'img_btn')}
            disabled={!imagePrompt}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer"
          >
            Copy Prompt 📋
          </button>
        </div>
      </div>
    </div>
  );
}