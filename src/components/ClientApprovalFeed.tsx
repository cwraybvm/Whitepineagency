'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';

interface ContentPost {
  id: string;
  title: string;
  status: string;
  approvalNotes?: string;
  instagramCaption?: string;
  linkedinPost?: string;
  reelScript?: string;
}

export default function ClientApprovalFeed({ organizationId }: { organizationId: string }) {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesInput, setNotesInput] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPending();
  }, [organizationId]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/approval?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch approval queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (postId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/social/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action,
          approvalNotes: notesInput[postId] || '',
        }),
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('Decision error:', err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-neutral-400">Loading pending reviews...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 text-center backdrop-blur-md">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-semibold text-white">All Caught Up!</h3>
        <p className="text-xs text-neutral-400 mt-1">There are no pending content posts waiting for client review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Content Approval Queue</h2>
          <p className="text-xs text-neutral-400">Review AI-generated release packs before public dispatch</p>
        </div>
      </div>

      {posts.map((post) => (
        <div key={post.id} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-lg font-medium text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{post.title}</span>
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {post.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {post.instagramCaption && (
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                <span className="font-semibold text-pink-400 block mb-1">📸 Instagram Copy</span>
                <p className="text-neutral-300 whitespace-pre-wrap">{post.instagramCaption}</p>
              </div>
            )}
            {post.linkedinPost && (
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                <span className="font-semibold text-blue-400 block mb-1">💼 LinkedIn Post</span>
                <p className="text-neutral-300 whitespace-pre-wrap">{post.linkedinPost}</p>
              </div>
            )}
          </div>

          {/* Feedback & Decision Row */}
          <div className="pt-2 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3">
            <div className="relative flex-1 w-full">
              <MessageSquare className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Optional feedback or change request notes..."
                value={notesInput[post.id] || ''}
                onChange={(e) => setNotesInput({ ...notesInput, [post.id]: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <button
                onClick={() => handleDecision(post.id, 'REJECT')}
                className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition"
              >
                <XCircle className="w-4 h-4" />
                <span>Request Edits</span>
              </button>

              <button
                onClick={() => handleDecision(post.id, 'APPROVE')}
                className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Post</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}