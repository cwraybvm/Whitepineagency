'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Send, Trash2, Pencil, X, CalendarClock } from 'lucide-react';

type Platform = 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'X_TWITTER';
type Status = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

type ScheduledPost = {
  id: string;
  platform: Platform;
  content: string;
  mediaUrl: string | null;
  scheduledFor: string;
  status: Status;
};

const DEFAULT_PRIMARY = '#2563EB';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'LINKEDIN', label: 'LinkedIn' },
  { id: 'FACEBOOK', label: 'Facebook' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'X_TWITTER', label: 'X (Twitter)' },
];

const TONES = ['Professional', 'Casual', 'Enthusiastic', 'Informative', 'Humorous'];

const STATUS_STYLES: Record<Status, string> = {
  DRAFT: 'bg-slate-800 text-slate-300 border-slate-700',
  SCHEDULED: 'bg-sky-950 text-sky-300 border-sky-800',
  PUBLISHED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  FAILED: 'bg-red-950 text-red-300 border-red-800',
};

function platformLabel(p: Platform) {
  return PLATFORMS.find((x) => x.id === p)?.label || p;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulerDashboard({ primaryColor }: { primaryColor: string | null }) {
  const color = primaryColor || DEFAULT_PRIMARY;

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Generator panel
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('LINKEDIN');
  const [tone, setTone] = useState(TONES[0]);
  const [generating, setGenerating] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftHashtags, setDraftHashtags] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick-edit modal
  const [editing, setEditing] = useState<ScheduledPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editScheduledFor, setEditScheduledFor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadPosts = () =>
    fetch('/api/scheduler', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadPosts();
  }, []);

  const generate = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/scheduler/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, platform }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      setDraftContent(data.content);
      setDraftHashtags(data.hashtags || []);
      toast.success('Draft generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate post draft');
    } finally {
      setGenerating(false);
    }
  };

  const schedulePost = async () => {
    if (!draftContent.trim()) {
      toast.error('Write or generate content first');
      return;
    }
    if (!scheduledFor) {
      toast.error('Pick a date and time');
      return;
    }
    setSaving(true);
    try {
      const content = draftHashtags.length ? `${draftContent}\n\n${draftHashtags.map((h) => `#${h}`).join(' ')}` : draftContent;
      const res = await fetch('/api/scheduler/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, scheduledFor: new Date(scheduledFor).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to schedule post');
      setDraftContent('');
      setDraftHashtags([]);
      setScheduledFor('');
      setTopic('');
      toast.success('Post scheduled');
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule post');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (post: ScheduledPost) => {
    setEditing(post);
    setEditContent(post.content);
    setEditScheduledFor(toDatetimeLocal(post.scheduledFor));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/scheduler/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, scheduledFor: new Date(editScheduledFor).toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to save changes');
      toast.success('Post updated');
      setEditing(null);
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const publishNow = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/scheduler/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      if (!res.ok) throw new Error('Failed to publish post');
      toast.success('Post marked as published');
      setEditing(null);
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish post');
    } finally {
      setEditSaving(false);
    }
  };

  const deletePost = async (id: string) => {
    const prev = posts;
    setPosts(posts.filter((p) => p.id !== id));
    setEditing(null);
    try {
      const res = await fetch(`/api/scheduler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      toast.success('Post deleted');
    } catch (err: any) {
      setPosts(prev);
      toast.error(err.message || 'Failed to delete post');
    }
  };

  const groups = posts.reduce<Record<string, ScheduledPost[]>>((acc, post) => {
    const key = new Date(post.scheduledFor).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    (acc[key] ||= []).push(post);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1400px] mx-auto font-sans text-slate-100" style={{ ['--portal-primary' as string]: color }}>
      <div>
        <span className="text-xs font-bold uppercase tracking-widest font-mono flex items-center gap-1.5" style={{ color: 'var(--portal-primary)' }}>
          <Sparkles className="w-3.5 h-3.5" /> AI Draft Generator
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Social Media Scheduler</h1>
        <p className="text-xs text-slate-400">Generate on-brand post drafts and queue them across your channels.</p>
      </div>

      {/* Generator panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Topic / Prompt</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. announcing our summer promo"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="py-2.5 px-4 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: 'var(--portal-primary)' }}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Post Drafts'}
        </button>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 font-mono uppercase">Content (edit freely, or write your own)</label>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={4}
            placeholder="Write a post manually, or generate a draft above…"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        {draftHashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draftHashtags.map((h) => (
              <span key={h} className="text-[10px] font-mono px-2 py-1 rounded-full border border-slate-700 text-slate-400">
                #{h}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase">Schedule For</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={schedulePost}
            disabled={saving}
            className="py-2.5 px-4 bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 border border-slate-700"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
            {saving ? 'Scheduling…' : 'Add to Queue'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Content Calendar</h2>
        {posts.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[120px] flex items-center justify-center text-center text-slate-400 text-sm">
            No posts queued yet. Generate a draft above to get started.
          </div>
        ) : (
          Object.entries(groups).map(([date, datePosts]) => (
            <div key={date} className="space-y-2">
              <div className="text-[11px] text-slate-500 font-mono uppercase">{date}</div>
              <div className="space-y-2">
                {datePosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => openEdit(post)}
                    className="w-full text-left bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--portal-primary)' }}>
                          {platformLabel(post.platform)}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[post.status]}`}>
                          {post.status}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(post.scheduledFor).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{post.content}</p>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick-edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Edit {platformLabel(editing.platform)} Post
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase">Scheduled For</label>
              <input
                type="datetime-local"
                value={editScheduledFor}
                onChange={(e) => setEditScheduledFor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => deletePost(editing.id)}
                className="py-2 px-3 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={publishNow}
                  disabled={editSaving || editing.status === 'PUBLISHED'}
                  className="py-2 px-3 bg-slate-800 border border-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" /> Publish Now
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="py-2 px-4 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--portal-primary)' }}
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
