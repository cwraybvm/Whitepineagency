# Direct Mail & Collateral Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Direct Mail Studio" tool to the AI Creative Sandbox that turns a brief into 3 audience-tailored direct mail variants, each rendered as an exportable postcard (front/back) or letter mockup with a QR code and the client's brand color.

**Architecture:** A Zod-validated request/response schema and prompt live in `sandboxPrompts.ts` alongside every other sandbox tool's schema. A thin `src/lib/directMail.ts` wrapper calls the existing `callOpenAiJson` multi-provider chain (with a `[MOCK]` fallback, same as `masterCampaign.ts`). A thin API route validates and delegates. Two presentational mockup components (postcard, letter) render a `DirectMailVariant` with a passed-in brand color; an orchestrator panel wires org selection, the brief form, generation, variant tabs, and PNG/PDF/JSON export using the same `html2canvas-pro` + `jsPDF` pattern already proven in `flyer-generator/page.tsx`.

**Tech Stack:** Next.js (App Router) API routes, Zod, React (client components), `react-qr-code`, `html2canvas-pro`, `jsPDF` — all already dependencies, no new packages.

## Global Constraints

- Full design spec: `docs/superpowers/specs/2026-08-05-direct-mail-collateral-studio-design.md` — read it before starting if anything below is ambiguous.
- **No `organizationId` sent to the API.** Voice/tone flows in as `activeBrandDna` (client-side state prop, same as every sibling panel). The org dropdown in the panel is client-side only — it feeds `brandColor`/`logoUrl`/`orgName` straight into the mockup components and is never sent to the server.
- **Keep the mock fallback** on this route (`mockDirectMailPackage`) — this tool is synthetic copy generation like the rest of the sandbox, unlike the brand-identity scraper which was intentionally de-mocked because it claims to reflect a real live site.
- **No `CreativeAsset` staging integration** and no `ScorableType` extension — this is a bundle/export-only tool, matching Master Campaign, Compliance Audit, and Brand Identity.
- **`html2canvas-pro` color constraint:** any DOM subtree that gets captured for PNG/PDF export must use inline hex/rgba colors (`style={{ color: '#...' }}`), never Tailwind color utility classes (`text-slate-900`, `bg-white`, etc.) — Tailwind v4 compiles colors to `oklch()`, which `html2canvas-pro`'s ancestor style walk can choke on even when the captured element itself uses plain colors. Tailwind classes are fine for layout/spacing/typography (`flex`, `p-4`, `text-4xl`, `font-black`). See the comment in `src/app/(fulfillment)/fulfillment/flyer-generator/page.tsx:22-29` for the precedent this follows.
- Postcard PDF pages: `jsPDF({ unit: 'in', format: [6, 4] })` (front page), then `pdf.addPage([6, 4])` (back page) — do not use the `orientation` param, the `[width, height]` array already encodes the landscape shape.
- Letter PDF page: `jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })` — identical to the existing flyer-generator PDF setup.
- No automated test framework exists for sandbox tools in this repo (none of Master Campaign / Landing Page Studio / Brand Identity / Compliance Audit have tests). Every task's verification step is `npx tsc --noEmit` plus either a manual `curl`/dev-server check or a manual browser check — there is no `pytest`/`jest`-equivalent step to add.

---

### Task 1: Data layer — schema, prompt, mock, validation

**Files:**
- Modify: `src/lib/sandboxPrompts.ts`

**Interfaces:**
- Produces: `FormFactorOptions`, `FormFactor`, `DirectMailVariantSchema`, `DirectMailPackageSchema`, `DirectMailPackage`, `DirectMailVariant`, `DIRECT_MAIL_PROMPT`, `mockDirectMailPackage(briefText: string, formFactor: FormFactor, audiences: string[], qrUrl: string): DirectMailPackage`, `validateDirectMailInput(body: any): string | null` — all consumed by Task 2.

- [ ] **Step 1: Add the schema types**

Add this block right after the `GeoExpansionPackageSchema`/`mockGeoExpansionPackage` section (end of file, before `GbpReviewResponseSchema`), in `src/lib/sandboxPrompts.ts`:

```ts
export const FormFactorOptions = ['postcard', 'letter'] as const;
export type FormFactor = (typeof FormFactorOptions)[number];

const PointOfContactSchema = z
  .object({
    name: z.string().catch(''),
    email: z.string().catch(''),
    phone: z.string().catch(''),
  })
  .catch({ name: '', email: '', phone: '' });

const DirectMailVariantSchema = z
  .object({
    audienceName: z.string().catch(''),
    headline: z.string().catch(''),
    subheadline: z.string().catch(''),
    bodyCopy: z.string().catch(''),
    callToAction: z.string().catch(''),
    urgencyDriver: z.string().catch(''),
    pointOfContact: PointOfContactSchema,
    eventDetailsSummary: z.string().catch(''),
  })
  .catch({
    audienceName: '',
    headline: '',
    subheadline: '',
    bodyCopy: '',
    callToAction: '',
    urgencyDriver: '',
    pointOfContact: { name: '', email: '', phone: '' },
    eventDetailsSummary: '',
  });

export const DirectMailPackageSchema = z.object({
  formFactor: z.enum(FormFactorOptions).catch('postcard'),
  qrUrl: z.string().catch(''),
  variants: z.array(DirectMailVariantSchema).catch([]),
});

export type DirectMailPackage = z.infer<typeof DirectMailPackageSchema>;
export type DirectMailVariant = z.infer<typeof DirectMailVariantSchema>;
```

- [ ] **Step 2: Add the prompt**

Add directly below the schema block from Step 1:

```ts
export const DIRECT_MAIL_PROMPT =
  'You are an expert direct-mail fundraising and marketing copywriter for a local-service/nonprofit marketing agency. ' +
  'You are given a brief (event details, offer, speakers, matching funds, etc.), a physical form factor, a QR code destination URL, and a list of target audiences. ' +
  'Write exactly one variant per audience, in the order given, each genuinely angled to that audience\'s relationship to the organization ' +
  '(e.g. a "Business Owners" variant leans into a sponsorship/partnership angle; a "Past Individual Donors" variant leans into a renewal/impact angle; a program-specific donor variant references that program directly). ' +
  'If the form factor is "postcard": headline, subheadline, and body copy must be extremely tight — a postcard is read in a few seconds on the way to the trash or the fridge, so lead with the single strongest claim and keep bodyCopy to 2-3 short sentences. ' +
  'If the form factor is "letter": write in a warm, personal business-fundraising-letter voice, read at a kitchen table — bodyCopy should be 3-5 short paragraphs that build the case and end on the ask. ' +
  'Every variant needs a plausible point of contact (name, email, phone) consistent with the organization in the brief, and an eventDetailsSummary that condenses the timeline/location/offer into 1-2 sentences suitable for a small print block. ' +
  'Return a valid JSON object matching this structure exactly: {"formFactor": "postcard" or "letter", "qrUrl": "the QR destination URL as given", "variants": [{"audienceName": "the audience name as given", "headline": "the headline", "subheadline": "the subheadline", "bodyCopy": "the body copy", "callToAction": "short CTA button/line text", "urgencyDriver": "the urgency angle for this audience", "pointOfContact": {"name": "contact name", "email": "contact email", "phone": "contact phone"}, "eventDetailsSummary": "condensed timeline/location/offer summary"}]} ' +
  'with exactly one entry in "variants" per audience given, in the same order.';
```

- [ ] **Step 3: Add the mock fallback**

Add directly below the prompt from Step 2:

```ts
export function mockDirectMailPackage(
  briefText: string,
  formFactor: FormFactor,
  audiences: string[],
  qrUrl: string,
): DirectMailPackage {
  const hook = cleanHook(briefText, 'Join Us For Our Upcoming Event');
  return {
    formFactor,
    qrUrl,
    variants: audiences.map((audienceName) => ({
      audienceName,
      headline: `[MOCK] ${hook}`,
      subheadline: `[MOCK — set OPENAI_API_KEY for real output] An invitation for ${audienceName}`,
      bodyCopy:
        formFactor === 'postcard'
          ? `[MOCK] ${hook}. Scan the code to RSVP.`
          : `[MOCK] Dear Friend,\n\n${hook}. As a valued member of our ${audienceName} community, your support makes a real difference.\n\nWe hope you'll join us.`,
      callToAction: 'Scan to RSVP',
      urgencyDriver: '[MOCK] Seats are limited — RSVP before the deadline.',
      pointOfContact: { name: 'Jordan Lee', email: 'events@example.org', phone: '(555) 010-2200' },
      eventDetailsSummary: `[MOCK] ${hook} — details and directions available at the link above.`,
    })),
  };
}
```

- [ ] **Step 4: Add input validation**

Add directly below the mock from Step 3:

```ts
export function validateDirectMailInput(body: any): string | null {
  if (!body || typeof body.briefText !== 'string' || !body.briefText.trim()) {
    return 'briefText is required';
  }
  if (body.formFactor !== 'postcard' && body.formFactor !== 'letter') {
    return "formFactor must be 'postcard' or 'letter'";
  }
  if (!Array.isArray(body.audiences) || body.audiences.length === 0 || !body.audiences.every((a: unknown) => typeof a === 'string' && a.trim())) {
    return 'audiences must be a non-empty array of non-empty strings';
  }
  if (typeof body.qrUrl !== 'string' || !body.qrUrl.trim()) {
    return 'qrUrl is required';
  }
  return null;
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors (the new exports aren't consumed yet, so this only checks the new code itself is well-typed).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add direct mail package schema, prompt, mock, and validation"
```

---

### Task 2: API layer — generation wrapper and route

**Files:**
- Create: `src/lib/directMail.ts`
- Create: `src/app/api/sandbox/direct-mail/route.ts`

**Interfaces:**
- Consumes (from Task 1): `DIRECT_MAIL_PROMPT`, `callOpenAiJson`, `mockDirectMailPackage`, `DirectMailPackageSchema`, `DirectMailPackage`, `FormFactor`, `BrandDna`, `validateDirectMailInput` — all from `@/lib/sandboxPrompts`.
- Produces: `generateDirectMailPackage(briefText: string, formFactor: FormFactor, audiences: string[], qrUrl: string, brandDna?: BrandDna): Promise<DirectMailPackage>` — consumed by the route in this task and by no one else yet.

- [ ] **Step 1: Write the generation wrapper**

Create `src/lib/directMail.ts`:

```ts
import {
  DIRECT_MAIL_PROMPT,
  callOpenAiJson,
  mockDirectMailPackage,
  DirectMailPackageSchema,
  type DirectMailPackage,
  type FormFactor,
  type BrandDna,
} from '@/lib/sandboxPrompts';

export async function generateDirectMailPackage(
  briefText: string,
  formFactor: FormFactor,
  audiences: string[],
  qrUrl: string,
  brandDna?: BrandDna,
): Promise<DirectMailPackage> {
  const userContext = [
    `Form factor: ${formFactor === 'postcard' ? '4x6 postcard (front/back)' : '8.5x11 letter'}`,
    `QR code destination: ${qrUrl}`,
    `Target audiences (write one variant per audience, in this order): ${audiences.join(', ')}`,
    'Brief:',
    briefText,
  ].join('\n\n');

  return callOpenAiJson(
    DIRECT_MAIL_PROMPT,
    userContext,
    () => mockDirectMailPackage(briefText, formFactor, audiences, qrUrl),
    0.7,
    DirectMailPackageSchema,
    brandDna,
  );
}
```

- [ ] **Step 2: Write the route**

Create `src/app/api/sandbox/direct-mail/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { validateDirectMailInput } from '@/lib/sandboxPrompts';
import { generateDirectMailPackage } from '@/lib/directMail';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateDirectMailInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await generateDirectMailPackage(
      body.briefText,
      body.formFactor,
      body.audiences,
      body.qrUrl,
      body.activeBrandDna,
    );

    return NextResponse.json({ success: true, ...result, formFactor: body.formFactor, qrUrl: body.qrUrl });
  } catch (err: any) {
    console.error('Sandbox direct-mail error:', err);
    return NextResponse.json({ error: err.message || 'Direct mail generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify the route with the dev server**

Run: `npm run dev` (in one terminal), then in another:

```bash
curl -s -X POST http://localhost:3000/api/sandbox/direct-mail \
  -H "Content-Type: application/json" \
  -d '{"briefText":"Fall gala, Nov 14, matching funds up to $10,000, keynote from our program director.","formFactor":"postcard","audiences":["Business Owners","Past Individual Donors"],"qrUrl":"https://example.org/rsvp"}'
```

Expected: JSON response with `"success": true`, `"formFactor": "postcard"`, `"qrUrl": "https://example.org/rsvp"`, and a `"variants"` array with exactly 2 entries (one per audience given), each with non-empty `headline`/`bodyCopy`/`pointOfContact`. If no LLM provider key is configured in `.env.local`, the copy will be `[MOCK]`-prefixed instead — that's expected, not a failure. Stop the dev server after checking (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/directMail.ts src/app/api/sandbox/direct-mail/route.ts
git commit -m "feat: add direct mail generation API route"
```

---

### Task 3: Postcard mockup component

**Files:**
- Create: `src/components/sandbox/DirectMailPostcardMockup.tsx`

**Interfaces:**
- Consumes (from Task 1): `DirectMailVariant` type from `@/lib/sandboxPrompts`.
- Produces: `DirectMailPostcardMockup` default export, props `{ variant: DirectMailVariant; brandColor: string; logoUrl?: string | null; orgName?: string; qrUrl: string; frontRef: React.RefObject<HTMLDivElement>; backRef: React.RefObject<HTMLDivElement> }` — consumed by `DirectMailPanel` in Task 6.

- [ ] **Step 1: Write the component**

Create `src/components/sandbox/DirectMailPostcardMockup.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/DirectMailPostcardMockup.tsx
git commit -m "feat: add direct mail postcard mockup component"
```

---

### Task 4: Letter mockup component

**Files:**
- Create: `src/components/sandbox/DirectMailLetterMockup.tsx`

**Interfaces:**
- Consumes (from Task 1): `DirectMailVariant` type from `@/lib/sandboxPrompts`.
- Produces: `DirectMailLetterMockup` default export, props `{ variant: DirectMailVariant; brandColor: string; logoUrl?: string | null; orgName?: string; qrUrl: string; letterRef: React.RefObject<HTMLDivElement> }` — consumed by `DirectMailPanel` in Task 6.

- [ ] **Step 1: Write the component**

Create `src/components/sandbox/DirectMailLetterMockup.tsx`:

```tsx
'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import type { DirectMailVariant } from '@/lib/sandboxPrompts';

// Same inline-color constraint as the postcard mockup — this subtree is
// captured by html2canvas-pro for PNG/PDF export.
export default function DirectMailLetterMockup({
  variant,
  brandColor,
  logoUrl,
  orgName,
  qrUrl,
  letterRef,
}: {
  variant: DirectMailVariant;
  brandColor: string;
  logoUrl?: string | null;
  orgName?: string;
  qrUrl: string;
  letterRef: React.RefObject<HTMLDivElement | null>;
}) {
  const displayOrgName = orgName || 'Your Organization';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const bodyParagraphs = (variant.bodyCopy || 'Body copy appears here.').split('\n').filter((p) => p.trim());

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
        <h2 className="text-lg font-black" style={{ color: '#0F172A' }}>
          {variant.headline}
        </h2>
        {variant.subheadline && (
          <p className="text-sm italic" style={{ color: '#475569' }}>
            {variant.subheadline}
          </p>
        )}
        {bodyParagraphs.map((para, i) => (
          <p key={i} className="text-xs leading-relaxed" style={{ color: '#1E293B' }}>
            {para}
          </p>
        ))}
        <p className="text-xs" style={{ color: '#1E293B' }}>
          Warm regards,
          <br />
          {variant.pointOfContact.name}
          <br />
          {variant.pointOfContact.email} · {variant.pointOfContact.phone}
        </p>
        {variant.urgencyDriver && (
          <p className="text-xs font-bold" style={{ color: brandColor }}>
            P.S. {variant.urgencyDriver}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: '#E2E8F0' }}>
        <div
          className="px-4 py-2 rounded text-xs font-bold"
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/DirectMailLetterMockup.tsx
git commit -m "feat: add direct mail letter mockup component"
```

---

### Task 5: DirectMailPanel — form controls and generation

**Files:**
- Create: `src/components/sandbox/DirectMailPanel.tsx`

**Interfaces:**
- Consumes: `OrgBrand` type from `./types`; `BrandDna`, `DirectMailPackage`, `FormFactorOptions`, `FormFactor` from `@/lib/sandboxPrompts`; `fetchJsonArray` from `@/lib/sandboxClientFetch`; `ActiveBrandDnaBadge` from `./ActiveBrandDnaBadge`.
- Produces: `DirectMailPanel` default export, props `{ activeBrandDna?: BrandDna | null }` — consumed by the sandbox page in Task 8. Internal state `pkg: DirectMailPackage | null` and `activeVariantIndex: number` — consumed by Task 6 (rendering) and Task 7 (export) in this same file.

- [ ] **Step 1: Write the panel shell with form controls**

Create `src/components/sandbox/DirectMailPanel.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2, Sparkles, Plus, X } from 'lucide-react';
import type { OrgBrand } from './types';
import type { BrandDna, DirectMailPackage, FormFactor } from '@/lib/sandboxPrompts';
import { FormFactorOptions } from '@/lib/sandboxPrompts';
import { fetchJsonArray } from '@/lib/sandboxClientFetch';
import ActiveBrandDnaBadge from './ActiveBrandDnaBadge';

const FALLBACK_BRAND_COLOR = '#059669';
const DEFAULT_AUDIENCES = ['Business Owners', 'Past Individual Donors', 'Reach Program Donors'];

export default function DirectMailPanel({ activeBrandDna }: { activeBrandDna?: BrandDna | null } = {}) {
  const [orgs, setOrgs] = useState<OrgBrand[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [briefText, setBriefText] = useState('');
  const [formFactor, setFormFactor] = useState<FormFactor>('postcard');
  const [audiences, setAudiences] = useState<string[]>(DEFAULT_AUDIENCES);
  const [qrUrl, setQrUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pkg, setPkg] = useState<DirectMailPackage | null>(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  useEffect(() => {
    fetchJsonArray<OrgBrand>('/api/sandbox/organizations').then(setOrgs);
  }, []);

  const selectedOrg = orgs.find((o) => o.id === organizationId);
  const brandColor = selectedOrg?.primaryColor || FALLBACK_BRAND_COLOR;

  const updateAudience = (index: number, value: string) => {
    setAudiences((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const removeAudience = (index: number) => {
    setAudiences((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const addAudience = () => {
    setAudiences((prev) => [...prev, '']);
  };

  const canGenerate =
    briefText.trim().length > 0 &&
    qrUrl.trim().length > 0 &&
    audiences.some((a) => a.trim().length > 0) &&
    !generating;

  const generate = async () => {
    const cleanAudiences = audiences.map((a) => a.trim()).filter(Boolean);
    if (!briefText.trim() || !qrUrl.trim() || cleanAudiences.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/sandbox/direct-mail', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText,
          formFactor,
          audiences: cleanAudiences,
          qrUrl,
          activeBrandDna: activeBrandDna || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Direct mail generation failed');
      const { success, ...rest } = data;
      setPkg(rest as DirectMailPackage);
      setActiveVariantIndex(0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate direct mail package');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* LEFT: Controls */}
      <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-4">
        {activeBrandDna && <ActiveBrandDnaBadge brandDna={activeBrandDna} />}
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Direct Mail Studio
        </h2>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Organization (brand color)</label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          >
            <option value="">No organization selected</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Brief</label>
          <textarea
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            rows={5}
            placeholder="e.g. Fall gala, Nov 14, matching funds up to $10,000, keynote from our program director."
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Form Factor</label>
          <div className="flex gap-2">
            {FormFactorOptions.map((ff) => (
              <button
                key={ff}
                onClick={() => setFormFactor(ff)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                  formFactor === ff
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {ff}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Audiences</label>
          <div className="space-y-1.5">
            {audiences.map((audience, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={audience}
                  onChange={(e) => updateAudience(i, e.target.value)}
                  placeholder="Audience name"
                  className="flex-1 bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
                />
                <button
                  onClick={() => removeAudience(i)}
                  disabled={audiences.length <= 1}
                  className="px-2 rounded-lg text-slate-400 hover:text-red-500 disabled:opacity-30"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addAudience}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:text-emerald-600 hover:border-emerald-500/50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Audience
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">QR Code Target URL</label>
          <input
            type="url"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            placeholder="https://example.org/rsvp"
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:bg-slate-950/50 dark:border-slate-800/80 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/80 transition-all duration-200"
          />
        </div>

        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 rounded-xl text-xs flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? 'Generating…' : 'Generate Direct Mail Variants'}
        </button>
      </div>

      {/* RIGHT: Results (Task 6 fills this in) */}
      <div className="space-y-4">
        {!pkg ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Fill in a brief and Generate Direct Mail Variants to see the mockups here.
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. `pkg` and `activeVariantIndex` are set but not yet read outside this file — that's expected at this point, Task 6 wires the rendering.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/DirectMailPanel.tsx
git commit -m "feat: add direct mail panel form controls and generation"
```

---

### Task 6: DirectMailPanel — variant tabs and mockup rendering

**Files:**
- Modify: `src/components/sandbox/DirectMailPanel.tsx`

**Interfaces:**
- Consumes (from Task 3): `DirectMailPostcardMockup` default export. Consumes (from Task 4): `DirectMailLetterMockup` default export.
- Produces: `frontRef`, `backRef`, `letterRef` (React refs) held in `DirectMailPanel` state — consumed by the export buttons added in Task 7.

- [ ] **Step 1: Add refs and imports**

In `src/components/sandbox/DirectMailPanel.tsx`, update the imports at the top:

```tsx
import { useState, useEffect, useRef } from 'react';
```

(replacing the existing `import { useState, useEffect } from 'react';` line), and add these two imports below the `ActiveBrandDnaBadge` import:

```tsx
import DirectMailPostcardMockup from './DirectMailPostcardMockup';
import DirectMailLetterMockup from './DirectMailLetterMockup';
```

- [ ] **Step 2: Add ref declarations**

Inside the `DirectMailPanel` function body, directly below the `const [activeVariantIndex, setActiveVariantIndex] = useState(0);` line, add:

```tsx
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Replace the placeholder results panel with variant tabs + mockup**

Replace this block (the `{/* RIGHT: Results (Task 6 fills this in) */}` section, i.e. everything from `<div className="space-y-4">` to its closing `</div>` right before the two closing `</div>` tags that end the component):

```tsx
      {/* RIGHT: Results (Task 6 fills this in) */}
      <div className="space-y-4">
        {!pkg ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Fill in a brief and Generate Direct Mail Variants to see the mockups here.
          </div>
        ) : null}
      </div>
```

with:

```tsx
      {/* RIGHT: Results */}
      <div className="space-y-4">
        {!pkg ? (
          <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center text-slate-500 dark:text-slate-400 text-sm">
            Fill in a brief and Generate Direct Mail Variants to see the mockups here.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-1.5">
              {pkg.variants.map((variant, i) => (
                <button
                  key={i}
                  onClick={() => setActiveVariantIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeVariantIndex === i
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {variant.audienceName || `Variant ${i + 1}`}
                </button>
              ))}
            </div>

            {pkg.variants[activeVariantIndex] &&
              (pkg.formFactor === 'postcard' ? (
                <DirectMailPostcardMockup
                  variant={pkg.variants[activeVariantIndex]}
                  brandColor={brandColor}
                  logoUrl={selectedOrg?.logoUrl}
                  orgName={selectedOrg?.name}
                  qrUrl={pkg.qrUrl}
                  frontRef={frontRef}
                  backRef={backRef}
                />
              ) : (
                <DirectMailLetterMockup
                  variant={pkg.variants[activeVariantIndex]}
                  brandColor={brandColor}
                  logoUrl={selectedOrg?.logoUrl}
                  orgName={selectedOrg?.name}
                  qrUrl={pkg.qrUrl}
                  letterRef={letterRef}
                />
              ))}
          </>
        )}
      </div>
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual visual check**

Run `npm run dev`, navigate to the sandbox page (the tab isn't wired in yet, so temporarily render `<DirectMailPanel activeBrandDna={null} />` in place of any existing tab's panel in `src/app/(sandbox)/sandbox/page.tsx` — a throwaway one-line edit, revert it immediately after checking, don't commit it). Fill in a brief, a QR URL, click Generate, confirm:
- Variant tabs appear, one per audience, and switching tabs swaps the mockup content.
- Postcard form factor shows a front card and a back card, with a QR code on the back.
- Letter form factor shows a single letter-shaped card with a QR code near the bottom.

Revert the throwaway page.tsx edit before continuing (`git checkout -- "src/app/(sandbox)/sandbox/page.tsx"` if you made one, or just undo it manually) — Task 8 wires this in for real.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/DirectMailPanel.tsx
git commit -m "feat: wire direct mail variant tabs and mockup rendering"
```

---

### Task 7: DirectMailPanel — PNG/PDF/JSON export

**Files:**
- Modify: `src/components/sandbox/DirectMailPanel.tsx`

**Interfaces:**
- Consumes: `frontRef`, `backRef`, `letterRef`, `pkg`, `activeVariantIndex`, `formFactor`, `selectedOrg` (all already in scope from Tasks 5-6).
- Produces: nothing new consumed elsewhere — this is the last piece of `DirectMailPanel` itself.

- [ ] **Step 1: Add export imports and state**

In `src/components/sandbox/DirectMailPanel.tsx`, add to the top-level imports (below the `lucide-react` import line):

```tsx
import { Download, FileImage, FileText, FileJson } from 'lucide-react';
```

(merge these into the existing `import { Mail, Loader2, Sparkles, Plus, X } from 'lucide-react';` line instead of a separate import — i.e. that line becomes `import { Mail, Loader2, Sparkles, Plus, X, Download, FileImage, FileText, FileJson } from 'lucide-react';`)

Add this state declaration below `const letterRef = useRef<HTMLDivElement>(null);`:

```tsx
  const [exporting, setExporting] = useState<'png' | 'pdf' | 'json' | null>(null);
```

- [ ] **Step 2: Add export helper functions**

Add these functions inside the `DirectMailPanel` component, directly above the `return (` line:

```tsx
  const captureCanvas = async (el: HTMLDivElement | null) => {
    if (!el) throw new Error('Mockup not ready');
    const html2canvas = (await import('html2canvas-pro')).default;
    return html2canvas(el, { scale: 3, useCORS: true });
  };

  const slugify = (value: string) => (value || 'direct-mail').replace(/\s+/g, '-').toLowerCase();

  const activeVariant = pkg?.variants[activeVariantIndex];

  const downloadPng = async () => {
    if (!pkg || !activeVariant) return;
    setExporting('png');
    try {
      const base = slugify(activeVariant.audienceName);
      if (pkg.formFactor === 'postcard') {
        const front = await captureCanvas(frontRef.current);
        const link1 = document.createElement('a');
        link1.download = `${base}-postcard-front.png`;
        link1.href = front.toDataURL('image/png');
        link1.click();
        const back = await captureCanvas(backRef.current);
        const link2 = document.createElement('a');
        link2.download = `${base}-postcard-back.png`;
        link2.href = back.toDataURL('image/png');
        link2.click();
      } else {
        const letter = await captureCanvas(letterRef.current);
        const link = document.createElement('a');
        link.download = `${base}-letter.png`;
        link.href = letter.toDataURL('image/png');
        link.click();
      }
      toast.success('PNG exported');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('Failed to export PNG');
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    if (!pkg || !activeVariant) return;
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const base = slugify(activeVariant.audienceName);
      if (pkg.formFactor === 'postcard') {
        const front = await captureCanvas(frontRef.current);
        const back = await captureCanvas(backRef.current);
        const pdf = new jsPDF({ unit: 'in', format: [6, 4] });
        pdf.addImage(front.toDataURL('image/png'), 'PNG', 0, 0, 6, 4);
        pdf.addPage([6, 4]);
        pdf.addImage(back.toDataURL('image/png'), 'PNG', 0, 0, 6, 4);
        pdf.save(`${base}-postcard.pdf`);
      } else {
        const letter = await captureCanvas(letterRef.current);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(letter.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
        pdf.save(`${base}-letter.pdf`);
      }
      toast.success('PDF exported');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  const downloadJson = () => {
    if (!pkg) return;
    setExporting('json');
    try {
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `direct-mail-${pkg.formFactor}-package.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Copy package exported');
    } finally {
      setExporting(null);
    }
  };
```

- [ ] **Step 3: Add the export buttons to the results panel**

In the JSX from Task 6, directly below the variant-tabs `<div>` (i.e. right after its closing `</div>` and before the `{pkg.variants[activeVariantIndex] &&` mockup block), add:

```tsx
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadPng}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileImage className="w-3.5 h-3.5" /> {exporting === 'png' ? 'Exporting…' : 'Download PNG'}
              </button>
              <button
                onClick={downloadPdf}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> {exporting === 'pdf' ? 'Exporting…' : 'Download PDF'}
              </button>
              <button
                onClick={downloadJson}
                disabled={exporting !== null}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5" /> Export All Copy (JSON)
              </button>
            </div>
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual export check**

Same throwaway-render approach as Task 6 Step 5: temporarily render `<DirectMailPanel activeBrandDna={null} />` on the sandbox page, generate a package, and for both form factors:
- Click **Download PNG** — confirm 1 file downloads for letter, 2 files (`-front.png`, `-back.png`) download for postcard, and each image visually matches the on-screen mockup (not blank/broken).
- Click **Download PDF** — confirm a PDF downloads and opens with the correct page count (1 page for letter, 2 pages for postcard) and correct page dimensions.
- Click **Export All Copy (JSON)** — confirm the downloaded file contains all variants, not just the active tab.

Revert the throwaway page.tsx edit before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/DirectMailPanel.tsx
git commit -m "feat: add direct mail PNG/PDF/JSON export"
```

---

### Task 8: Page wiring

**Files:**
- Modify: `src/components/sandbox/types.ts`
- Modify: `src/app/(sandbox)/sandbox/page.tsx`

**Interfaces:**
- Consumes: `DirectMailPanel` default export from `./DirectMailPanel` (Tasks 5-7).

- [ ] **Step 1: Add the tool id to the union type**

In `src/components/sandbox/types.ts`, change line 1 from:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe' | 'landing-page' | 'brand-identity' | 'master-campaign' | 'compliance-audit';
```

to:

```ts
export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe' | 'landing-page' | 'brand-identity' | 'master-campaign' | 'compliance-audit' | 'direct-mail';
```

- [ ] **Step 2: Add the tab and panel to the sandbox page**

In `src/app/(sandbox)/sandbox/page.tsx`:

Change the lucide-react import (line 4) from:

```tsx
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop, Fingerprint, Calendar, ShieldCheck } from 'lucide-react';
```

to:

```tsx
import { PenTool, LayoutTemplate, Clapperboard, Sparkles, Archive, Rocket, ScanSearch, LayoutPanelTop, Fingerprint, Calendar, ShieldCheck, Mail } from 'lucide-react';
```

Add this import below the `ComplianceAuditPanel` import (line 13):

```tsx
import DirectMailPanel from '@/components/sandbox/DirectMailPanel';
```

Add this entry to the `TABS` array (line 19-29), after the `compliance-audit` entry:

```ts
  { id: 'direct-mail', label: 'Direct Mail Studio', icon: Mail },
```

Add this render block after the `compliance-audit` block (after its closing `)}` around line 144), before the closing `</>` :

```tsx
          {activeTool === 'direct-mail' && <DirectMailPanel activeBrandDna={activeBrandDna} />}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Full build check**

Run: `npm run build`
Expected: build completes with no errors, `/api/sandbox/direct-mail` appears in the route listing output.

- [ ] **Step 5: Manual end-to-end check**

Run `npm run dev`, navigate to `/sandbox`, click the new **Direct Mail Studio** tab, and confirm the panel renders in its real tab slot (no more throwaway edit needed). Run through the full flow once more: pick an org (if any exist), fill in a brief + QR URL, toggle both form factors, generate, switch variant tabs, and download at least one PNG and one PDF successfully.

- [ ] **Step 6: Commit**

```bash
git add src/components/sandbox/types.ts "src/app/(sandbox)/sandbox/page.tsx"
git commit -m "feat: add direct mail studio tab to sandbox page"
```

---

## Self-Review Notes

- **Spec coverage:** Data layer (Task 1) → API layer (Task 2) → postcard mockup (Task 3) → letter mockup (Task 4) → panel form/generation (Task 5) → variant tabs/rendering (Task 6) → export (Task 7) → page wiring (Task 8). Every section of the design spec (`docs/superpowers/specs/2026-08-05-direct-mail-collateral-studio-design.md`) maps to a task; the `organizationId`-round-trip deviation and the mock-fallback/no-staging conventions are captured in Global Constraints so every task inherits them.
- **Type consistency:** `DirectMailVariant`/`DirectMailPackage`/`FormFactor` (Task 1) are the exact names threaded through `directMail.ts` (Task 2), both mockup components (Tasks 3-4), and `DirectMailPanel` (Tasks 5-7) — verified no renaming drift between tasks. `frontRef`/`backRef`/`letterRef` prop names match between where they're declared (Task 6) and where the mockup components expect them (Tasks 3-4).
- **Placeholder scan:** every step has real, complete code — no "add error handling" or "similar to Task N" placeholders.
