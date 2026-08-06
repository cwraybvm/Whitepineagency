'use client';

import { useMemo } from 'react';
import { Mail, Link2, Gauge } from 'lucide-react';

const EMAIL_OR_PHONE = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}|(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const CTA_LINK = /https?:\/\/[^\s]+|www\.[^\s]+/i;

type Quality = 'Sparse' | 'Optimal' | 'Rich';

function qualityFor(length: number): Quality {
  if (length < 80) return 'Sparse';
  if (length <= 400) return 'Optimal';
  return 'Rich';
}

const QUALITY_COLOR: Record<Quality, string> = {
  Sparse: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  Optimal: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  Rich: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
};

function Chip({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
        ok ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
      }`}
    >
      {icon} {label}
    </span>
  );
}

export default function PromptHealthBadge({ text, checkContactInfo = false }: { text: string; checkContactInfo?: boolean }) {
  const hasContactInfo = useMemo(() => EMAIL_OR_PHONE.test(text), [text]);
  const hasCtaLink = useMemo(() => CTA_LINK.test(text), [text]);
  const quality = useMemo(() => qualityFor(text.trim().length), [text]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {checkContactInfo && (
        <Chip ok={hasContactInfo} icon={<Mail className="w-3 h-3" />} label={hasContactInfo ? 'Contact info found' : 'Missing contact info'} />
      )}
      <Chip ok={hasCtaLink} icon={<Link2 className="w-3 h-3" />} label={hasCtaLink ? 'CTA link found' : 'No CTA link'} />
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${QUALITY_COLOR[quality]}`}>
        <Gauge className="w-3 h-3" /> Brief: {quality}
      </span>
    </div>
  );
}
