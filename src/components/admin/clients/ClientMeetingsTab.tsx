'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  attendees: string[];
  bodyMarkdown: string;
  billableHours: number;
}

export default function ClientMeetingsTab({ clientId }: { clientId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendeesInput, setAttendeesInput] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [billableHours, setBillableHours] = useState(0);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/meetings`)
      .then((res) => res.json())
      .then(setMeetings)
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          meetingDate,
          attendees: attendeesInput.split(',').map((a) => a.trim()).filter(Boolean),
          bodyMarkdown,
          billableHours,
        }),
      });
      if (!res.ok) throw new Error('Failed to save meeting');
      toast.success('Meeting note saved');
      setModalOpen(false);
      setTitle('');
      setBodyMarkdown('');
      setAttendeesInput('');
      setBillableHours(0);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
      >
        <Plus className="w-4 h-4" /> New Meeting Note
      </button>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div key={m.id} className="border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{m.title}</span>
                <span className="text-xs text-gray-500">{new Date(m.meetingDate).toLocaleDateString()}</span>
              </div>
              {m.attendees.length > 0 && (
                <div className="text-xs text-gray-400">Attendees: {m.attendees.join(', ')}</div>
              )}
              <div
                className="prose prose-invert prose-sm max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: marked.parse(m.bodyMarkdown || '') as string }}
              />
              {m.billableHours > 0 && (
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <Clock className="w-3 h-3" /> {m.billableHours}h billable
                </div>
              )}
            </div>
          ))}
          {meetings.length === 0 && <div className="text-gray-500 text-sm">No meeting notes yet.</div>}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080E1A] border border-white/20 p-6 rounded-3xl shadow-2xl max-w-lg w-full space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">New Meeting Note</span>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                placeholder="Attendees (comma-separated)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <textarea
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                placeholder="Notes (markdown supported)"
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              <input
                type="number"
                step="0.25"
                min="0"
                value={billableHours}
                onChange={(e) => setBillableHours(Number(e.target.value))}
                placeholder="Billable hours"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
