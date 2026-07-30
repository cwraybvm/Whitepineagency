'use client';

import React, { useState } from 'react';
import { Eye, Send, Monitor, Smartphone, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function VisualProofingViewer({
  organizationId,
  previewUrl = 'https://example.com',
}: {
  organizationId: string;
  previewUrl?: string;
}) {
  const [url, setUrl] = useState(previewUrl);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteComment, setNoteComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/webhooks/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          title: noteTitle || 'Design Review Note',
          comment: noteComment,
          reporterName: 'Client Reviewer',
          targetUrl: url,
          browserInfo: `${navigator.userAgent.slice(0, 40)}...`,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setNoteTitle('');
        setNoteComment('');
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (err) {
      console.error('Failed to submit visual feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Visual Proofing & Feedback</h2>
            <p className="text-xs text-neutral-400">Review live staging links and push revision notes to the agency Kanban</p>
          </div>
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center space-x-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-lg text-xs transition ${
              viewMode === 'desktop' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-lg text-xs transition ${
              viewMode === 'mobile' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Interactive Frame */}
        <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 backdrop-blur-md flex flex-col space-y-3">
          <div className="flex items-center space-x-2 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 text-xs">
            <span className="text-neutral-500 font-mono">Staging URL:</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-transparent text-white flex-1 focus:outline-none font-mono text-[11px]"
            />
            <a href={url} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div
            className={`mx-auto w-full transition-all duration-300 ${
              viewMode === 'mobile' ? 'max-w-sm h-[500px]' : 'w-full h-[500px]'
            } bg-black rounded-xl overflow-hidden border border-neutral-800 relative`}
          >
            <iframe src={url} className="w-full h-full border-none" title="Staging Proofing View" />
          </div>
        </div>

        {/* Feedback Submission Panel */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Submit Revision Note</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Notes submitted here automatically create a card on the agency task board with device metadata.
            </p>

            {submitted && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Feedback converted into a Kanban task!
              </div>
            )}

            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Issue / Feature Title</label>
                <input
                  type="text"
                  placeholder="e.g. Header text size on mobile"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Detailed Comment</label>
                <textarea
                  rows={4}
                  placeholder="Describe the change or issue you'd like adjusted..."
                  value={noteComment}
                  onChange={(e) => setNoteComment(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white text-xs p-3 rounded-xl focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !noteComment.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-black font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting Task...' : 'Push Feedback to Agency Board'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}