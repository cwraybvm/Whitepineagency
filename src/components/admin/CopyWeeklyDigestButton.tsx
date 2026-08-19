'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { buildWeeklyDigestText, type WeeklyDigest } from '@/lib/weeklyDigestText';

interface CopyWeeklyDigestButtonProps {
  date?: string;
  className?: string;
}

export default function CopyWeeklyDigestButton({ date, className }: CopyWeeklyDigestButtonProps) {
  const [loading, setLoading] = useState(false);

  async function copyDigest() {
    setLoading(true);
    try {
      const url = date ? `/api/bvm/weekly-digest?date=${date}` : '/api/bvm/weekly-digest';
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const digest: WeeklyDigest = await res.json();
      await navigator.clipboard.writeText(buildWeeklyDigestText(digest));
      toast.success('Weekly digest copied — paste into a message');
    } catch {
      toast.error('Failed to copy weekly digest');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={copyDigest}
      disabled={loading}
      className={
        className ||
        'min-h-[44px] flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 rounded-xl disabled:opacity-50'
      }
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>📲</span>}
      {loading ? 'Copying…' : 'Copy Weekly Digest Text'}
    </button>
  );
}
