'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import type { DirectMailVariant } from '@/lib/sandboxPrompts';

// html2canvas-pro captures this subtree for PNG/PDF export — every color here
// is an inline hex/rgba style, never a Tailwind color class, because
// Tailwind v4's oklch()-based utilities can crash the capture even on
// ancestor elements that never use them (see flyer-generator's precedent).
export default function DirectMailPostcardMockup({
  variant,
  brandColor,
  logoUrl,
  orgName,
  qrUrl,
  frontRef,
  backRef,
}: {
  variant: DirectMailVariant;
  brandColor: string;
  logoUrl?: string | null;
  orgName?: string;
  qrUrl: string;
  frontRef: React.RefObject<HTMLDivElement | null>;
  backRef: React.RefObject<HTMLDivElement | null>;
}) {
  const displayOrgName = orgName || 'Your Organization';

  return (
    <div className="flex flex-col gap-4 items-center">
      {/* FRONT */}
      <div
        ref={frontRef}
        className="w-full max-w-[600px] aspect-[3/2] rounded-lg border shadow-xl relative overflow-hidden flex flex-col justify-between p-8"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: brandColor }}
        />
        <div className="flex items-center gap-2 pt-2">
          {logoUrl && <img src={logoUrl} alt="" className="w-8 h-8 rounded object-cover" />}
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brandColor }}>
            {displayOrgName}
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black leading-tight" style={{ color: '#0F172A' }}>
            {variant.headline || 'Your headline appears here'}
          </h2>
          <p className="text-base font-semibold" style={{ color: '#475569' }}>
            {variant.subheadline || 'Your subheadline appears here'}
          </p>
        </div>
      </div>

      {/* BACK */}
      <div
        ref={backRef}
        className="w-full max-w-[600px] aspect-[3/2] rounded-lg border shadow-xl relative overflow-hidden flex p-6 gap-6"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {/* Message column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#1E293B' }}>
              {variant.bodyCopy || 'Body copy appears here.'}
            </p>
            <p className="text-xs font-bold" style={{ color: brandColor }}>
              {variant.urgencyDriver}
            </p>
            <p className="text-[11px]" style={{ color: '#64748B' }}>
              {variant.eventDetailsSummary}
            </p>
          </div>
          <div className="space-y-1.5">
            <div
              className="inline-block px-3 py-1.5 rounded text-xs font-bold"
              style={{ backgroundColor: brandColor, color: '#FFFFFF' }}
            >
              {variant.callToAction || 'Call to Action'}
            </div>
            <p className="text-[10px]" style={{ color: '#64748B' }}>
              {variant.pointOfContact.name} · {variant.pointOfContact.phone} · {variant.pointOfContact.email}
            </p>
          </div>
        </div>

        {/* Postcard-back chrome */}
        <div className="w-[180px] shrink-0 flex flex-col justify-between border-l pl-4" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex justify-between items-start">
            <p className="text-[9px] leading-tight" style={{ color: '#475569' }}>
              {displayOrgName}
            </p>
            <div
              className="w-12 h-12 border flex items-center justify-center text-[7px] text-center leading-tight shrink-0"
              style={{ borderColor: '#94A3B8', color: '#94A3B8' }}
            >
              PLACE STAMP HERE
            </div>
          </div>
          <div className="flex justify-center py-2">
            <div className="p-1.5 bg-white border" style={{ borderColor: '#E2E8F0' }}>
              <QRCode value={qrUrl || 'https://example.com'} size={64} />
            </div>
          </div>
          <div
            className="flex-1 border-t border-dashed rounded p-2"
            style={{ borderColor: '#94A3B8' }}
          >
            <p className="text-[8px] uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Recipient Address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
