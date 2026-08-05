import type { BrandDna } from '@/lib/sandboxPrompts';

export default function ActiveBrandDnaBadge({ brandDna }: { brandDna: BrandDna }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      Active Brand Context: {brandDna.brandName || 'Unnamed Brand'}
    </span>
  );
}
