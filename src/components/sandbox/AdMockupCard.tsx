'use client';

import { ThumbsUp } from 'lucide-react';
import { ASPECT_RATIOS, type AspectRatioId } from './types';

export default function AdMockupCard({
  aspectRatio,
  imageUrl,
  brandColor,
  logoUrl,
  orgName,
  platform,
  headline,
  content,
  cta,
  onImageError,
}: {
  aspectRatio: AspectRatioId;
  imageUrl?: string;
  brandColor: string;
  logoUrl?: string | null;
  orgName?: string;
  platform: string;
  headline?: string;
  content?: string;
  cta?: string;
  onImageError?: () => void;
}) {
  const activeRatio = ASPECT_RATIOS.find((r) => r.id === aspectRatio)!;
  const displayName = orgName || 'Your Business';

  return (
    <div
      className="relative w-full rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900 flex flex-col"
      style={{ maxWidth: activeRatio.maxWidth }}
    >
      {/* Simulated social post header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 overflow-hidden"
          style={{ backgroundColor: brandColor }}
        >
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{displayName}</p>
          <p className="text-[9px] text-slate-400 font-mono">Sponsored</p>
        </div>
        <span className="text-[9px] font-mono font-bold uppercase text-slate-500 border border-slate-700 rounded-full px-1.5 py-0.5 shrink-0">
          {platform}
        </span>
      </div>

      <div className={`relative w-full ${activeRatio.aspectClass}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={onImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-600 text-xs font-mono uppercase text-center px-6">
            Drop or paste an image URL
          </div>
        )}

        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${brandColor}E6 0%, ${brandColor}66 35%, transparent 65%)` }}
        />

        <div className="absolute bottom-0 inset-x-0 p-5 space-y-1.5">
          <h3 className="text-xl font-black text-white leading-tight drop-shadow">
            {headline || 'Your headline appears here'}
          </h3>
          <p className={`text-sm text-white/90 whitespace-pre-wrap drop-shadow ${aspectRatio === '16:9' ? 'line-clamp-2' : 'line-clamp-4'}`}>
            {content || 'Generate an ad to see the body copy here.'}
          </p>
          <button
            disabled
            style={{ backgroundColor: brandColor }}
            className="mt-2 w-full py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <ThumbsUp className="w-3 h-3" /> {cta || 'Call to Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
