'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Globe, Mail, Save, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeClient: {
    id?: string;
    organizationId?: string;
    businessName?: string;
  } | null;
}

export default function IntegrationSettingsDrawer({
  isOpen,
  onClose,
  activeClient,
}: IntegrationSettingsDrawerProps) {
  const [mailchimpApiKey, setMailchimpApiKey] = useState('');
  const [mailchimpListId, setMailchimpListId] = useState('');
  const [wordpressUrl, setWordpressUrl] = useState('');
  const [wordpressUsername, setWordpressUsername] = useState('');
  const [wordpressAppPass, setWordpressAppPass] = useState('');
  const [isSaving, setIsGenerating] = useState(false);

  const clientName = activeClient?.businessName || 'TRK Ministries';
  const orgId = activeClient?.organizationId || activeClient?.id || 'demo-default-org';

  // Load existing credentials when drawer opens
  useEffect(() => {
    if (isOpen && orgId) {
      fetch(`/api/organizations/credentials?organizationId=${orgId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setMailchimpApiKey(data.mailchimpApiKey || '');
            setMailchimpListId(data.mailchimpListId || '');
            setWordpressUrl(data.wordpressUrl || '');
            setWordpressUsername(data.wordpressUsername || '');
            setWordpressAppPass(data.wordpressAppPass || '');
          }
        })
        .catch(() => {});
    }
  }, [isOpen, orgId]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch('/api/organizations/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          mailchimpApiKey,
          mailchimpListId,
          wordpressUrl,
          wordpressUsername,
          wordpressAppPass,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      toast.success(`✅ Saved integration keys for ${clientName}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error saving credentials');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#080E1A] border-l border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Integration Keys & Vault
                    </h3>
                  </div>
                  <p className="text-gray-400 text-[10px] mt-0.5 font-sans">
                    Configuring API keys for: <strong className="text-indigo-300">{clientName}</strong>
                  </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="vault-form" onSubmit={handleSaveCredentials} className="space-y-6">
                {/* 📧 Mailchimp Configuration */}
                <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-white/10 pb-2">
                    <Mail className="w-4 h-4" />
                    <span className="uppercase text-[11px]">Mailchimp Email Blast Settings</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block text-[10px]">
                      Mailchimp API Key *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="e.g. 84930xxxxxxxxx-us19"
                        value={mailchimpApiKey}
                        onChange={(e) => setMailchimpApiKey(e.target.value)}
                        className="w-full bg-slate-950 border border-white/15 p-2.5 pl-8 text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500"
                      />
                      <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block text-[10px]">
                      Audience List ID (List ID) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. a1b2c3d4e5"
                      value={mailchimpListId}
                      onChange={(e) => setMailchimpListId(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* 🌐 WordPress REST API Configuration */}
                <div className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold border-b border-white/10 pb-2">
                    <Globe className="w-4 h-4" />
                    <span className="uppercase text-[11px]">WordPress Blog Direct Publisher</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block text-[10px]">
                      WordPress Site Domain URL
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://trkministries.org"
                      value={wordpressUrl}
                      onChange={(e) => setWordpressUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block text-[10px]">
                        WP Admin Username
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. admin"
                        value={wordpressUsername}
                        onChange={(e) => setWordpressUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block text-[10px]">
                        Application Password
                      </label>
                      <input
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={wordpressAppPass}
                        onChange={(e) => setWordpressAppPass(e.target.value)}
                        className="w-full bg-slate-950 border border-white/15 p-2.5 text-white rounded-xl font-sans text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-gray-500 text-[9px] font-sans">
                    * Generate an Application Password under WP-Admin ➔ Users ➔ Profile ➔ Application Passwords.
                  </p>
                </div>
              </form>
            </div>

            {/* Footer Submit Bar */}
            <div className="border-t border-white/10 pt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-bold rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="vault-form"
                disabled={isSaving}
                className="w-2/3 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl cursor-pointer shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Integrations'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}