'use client';

import { useEffect, useState } from 'react';
import { Plus, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import CampaignComparisonTable from '@/components/sandbox/CampaignComparisonTable';
import FeatureGuard from '@/components/FeatureGuard';
import FeatureLockedPlaceholder from '@/components/FeatureLockedPlaceholder';

interface Variant {
  id: string;
  headline: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  variants: Variant[];
}

export default function CampaignSandboxPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [variantForm, setVariantForm] = useState<Record<string, { headline: string; spend: string; impressions: string; clicks: string; conversions: string }>>({});

  function load() {
    fetch('/api/sandbox/campaigns')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load campaigns');
        return res.json();
      })
      .then(setCampaigns)
      .catch(() => toast.error('Failed to load campaigns'));
  }

  useEffect(load, []);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    const res = await fetch('/api/sandbox/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCampaignName.trim() }),
    });
    if (!res.ok) {
      toast.error('Failed to create campaign');
      return;
    }
    setNewCampaignName('');
    load();
  }

  function formFor(campaignId: string) {
    return variantForm[campaignId] || { headline: '', spend: '', impressions: '', clicks: '', conversions: '' };
  }

  async function handleAddVariant(campaignId: string) {
    const form = formFor(campaignId);
    if (!form.headline.trim()) return;
    const res = await fetch(`/api/sandbox/campaigns/${campaignId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: form.headline,
        spend: Number(form.spend) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        conversions: Number(form.conversions) || 0,
      }),
    });
    if (!res.ok) {
      toast.error('Failed to add variant');
      return;
    }
    setVariantForm((prev) => ({ ...prev, [campaignId]: { headline: '', spend: '', impressions: '', clicks: '', conversions: '' } }));
    load();
  }

  return (
    <FeatureGuard feature="campaign" fallback={<FeatureLockedPlaceholder feature="campaign" />}>
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-emerald-400" />
        <h1 className="text-lg font-bold text-white">Campaign A/B Sandbox</h1>
      </div>

      <form onSubmit={handleCreateCampaign} className="flex gap-2">
        <input
          value={newCampaignName}
          onChange={(e) => setNewCampaignName(e.target.value)}
          placeholder="New campaign name"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="space-y-6">
        {campaigns.map((c) => {
          const form = formFor(c.id);
          return (
            <div key={c.id} className="space-y-3">
              <div className="text-white font-medium">{c.name}</div>
              <CampaignComparisonTable variants={c.variants} />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <input
                  value={form.headline}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, headline: e.target.value } }))}
                  placeholder="Headline / hook"
                  className="col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.spend}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, spend: e.target.value } }))}
                  placeholder="Spend"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.impressions}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, impressions: e.target.value } }))}
                  placeholder="Impressions"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.clicks}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, clicks: e.target.value } }))}
                  placeholder="Clicks"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  value={form.conversions}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, [c.id]: { ...form, conversions: e.target.value } }))}
                  placeholder="Conversions"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                onClick={() => handleAddVariant(c.id)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-medium"
              >
                Add Variant
              </button>
            </div>
          );
        })}
        {campaigns.length === 0 && <div className="text-gray-500 text-sm">No campaigns yet.</div>}
      </div>
    </div>
    </FeatureGuard>
  );
}
