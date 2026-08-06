'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FEATURE_KEYS, FEATURE_LABELS } from '@/config/tenantFeatures';
import type { FeatureKey } from '@/config/tenantFeatures';

interface Branding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  disabledFeatures: FeatureKey[];
}

const DEFAULT_PRIMARY = '#2563EB';
const DEFAULT_ACCENT = '#EA580C';

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [disabledFeatures, setDisabledFeatures] = useState<FeatureKey[]>([]);

  useEffect(() => {
    fetch('/api/portal/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<Branding> | null) => {
        if (!data) return;
        setLogoUrl(data.logoUrl ?? null);
        setCustomDomain(data.customDomain ?? null);
        setPrimaryColor(data.primaryColor || DEFAULT_PRIMARY);
        setAccentColor(data.accentColor || DEFAULT_ACCENT);
        setDisabledFeatures(data.disabledFeatures ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleFeature(feature: FeatureKey) {
    setDisabledFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl, primaryColor, accentColor, customDomain, disabledFeatures }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      toast.success('Branding updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-[var(--color-foreground)]">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">Branding & Features</h1>
        <p className="text-sm text-[var(--color-foreground)]/70">
          Colors and studio access for your portal.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Colors</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            Primary
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-14 rounded border border-[var(--color-border)]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
            Accent
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-14 rounded border border-[var(--color-border)]"
            />
          </label>
        </div>

        <div
          className="rounded-xl border border-[var(--color-border)] p-4"
          style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
        >
          <p className="text-sm font-medium">Preview</p>
          <button
            type="button"
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
          >
            Accent Button
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Studio Access</h2>
        <div className="space-y-2">
          {FEATURE_KEYS.map((feature) => (
            <label
              key={feature}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {FEATURE_LABELS[feature]}
              <input
                type="checkbox"
                checked={!disabledFeatures.includes(feature)}
                onChange={() => toggleFeature(feature)}
              />
            </label>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
