'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import type { DirectMailVariant } from '@/lib/sandboxPrompts';

// Same inline-color constraint as the postcard mockup — this subtree is
// captured by html2canvas-pro for PNG/PDF export.
type EditableField = 'headline' | 'subheadline' | 'bodyCopy' | 'callToAction' | 'urgencyDriver';

export default function DirectMailLetterMockup({
  variant,
  brandColor,
  logoUrl,
  orgName,
  qrUrl,
  letterRef,
  onEditField,
}: {
  variant: DirectMailVariant;
  brandColor: string;
  logoUrl?: string | null;
  orgName?: string;
  qrUrl: string;
  letterRef: React.RefObject<HTMLDivElement | null>;
  onEditField: (field: EditableField, value: string) => void;
}) {
  const displayOrgName = orgName || 'Your Organization';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const bodyParagraphs = (variant.bodyCopy || 'Body copy appears here.').split('\n').filter((p) => p.trim());
  const commit = (field: EditableField) => (e: React.FocusEvent<HTMLElement>) =>
    onEditField(field, e.currentTarget.innerText);

  return (
    <div
      ref={letterRef}
      className="w-full max-w-[650px] aspect-[8.5/11] mx-auto rounded-lg border shadow-xl overflow-hidden flex flex-col p-12"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center gap-2">
          {logoUrl && <img src={logoUrl} alt="" className="w-9 h-9 rounded object-cover" />}
          <span className="text-sm font-black" style={{ color: brandColor }}>
            {displayOrgName}
          </span>
        </div>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {today}
        </span>
      </div>

      <div className="flex-1 pt-6 space-y-3 overflow-hidden">
        <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
          Dear Friend,
        </p>
        <h2
          contentEditable
          suppressContentEditableWarning
          onBlur={commit('headline')}
          className="text-lg font-black cursor-text"
          style={{ color: '#0F172A' }}
        >
          {variant.headline}
        </h2>
        {variant.subheadline && (
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={commit('subheadline')}
            className="text-sm italic cursor-text"
            style={{ color: '#475569' }}
          >
            {variant.subheadline}
          </p>
        )}
        <div contentEditable suppressContentEditableWarning onBlur={commit('bodyCopy')} className="cursor-text">
          {bodyParagraphs.map((para, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: '#1E293B' }}>
              {para}
            </p>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#1E293B' }}>
          Warm regards,
          <br />
          {variant.pointOfContact.name}
          <br />
          {variant.pointOfContact.email} · {variant.pointOfContact.phone}
        </p>
        {variant.urgencyDriver && (
          <p className="text-xs font-bold" style={{ color: brandColor }}>
            P.S.{' '}
            <span contentEditable suppressContentEditableWarning onBlur={commit('urgencyDriver')} className="cursor-text">
              {variant.urgencyDriver}
            </span>
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: '#E2E8F0' }}>
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={commit('callToAction')}
          className="px-4 py-2 rounded text-xs font-bold cursor-text"
          style={{ backgroundColor: brandColor, color: '#FFFFFF' }}
        >
          {variant.callToAction || 'Call to Action'}
        </div>
        <div className="p-1.5 bg-white border" style={{ borderColor: '#E2E8F0' }}>
          <QRCode value={qrUrl || 'https://example.com'} size={56} />
        </div>
      </div>
    </div>
  );
}
