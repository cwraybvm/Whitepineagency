'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mail, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { BVM_TEMPLATE_VARIABLES } from '@/lib/bvmEmailTemplates';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const EMPTY_FORM = { name: '', subject: '', body: '', category: '' };

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/bvm/email-templates')
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bvm/email-templates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? 'Template updated' : 'Template created');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/bvm/email-templates?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to delete template');
      load();
    }
  }

  const byCategory: Record<string, EmailTemplate[]> = {};
  for (const t of templates) {
    (byCategory[t.category] ||= []).push(t);
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Email Template Vault</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
            Variables: {BVM_TEMPLATE_VARIABLES.map((v) => (
              <code key={v} className="bg-white/5 text-emerald-300 rounded px-1 mx-0.5">{v}</code>
            ))}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">No templates yet — add one above.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-[11px] font-mono uppercase text-slate-500 font-bold mb-2">{category}</h3>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{t.subject}</p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{t.body}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{editingId ? 'Edit Template' : 'New Template'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Name</label>
            <input required placeholder="e.g. LMGK Follow-Up" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Category</label>
            <input required placeholder="e.g. LMGK Follow-up" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">Subject</label>
            <input required placeholder="Email subject line" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />

            <label className="text-[11px] font-mono uppercase text-slate-500 block">
              Body <span className="text-slate-600 normal-case">— use {BVM_TEMPLATE_VARIABLES.join(', ')}</span>
            </label>
            <textarea required rows={10} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white resize-y font-mono" />

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Template'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
