# Intake-to-Drive-Campaign Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the client intake form to trigger Brand DNA extraction and 30-Day Master Campaign generation on submit, returning the campaign package alongside the existing Google Drive upload result.

**Architecture:** `generateMasterCampaign()` is extracted out of the sandbox master-campaign route into `src/lib/masterCampaign.ts` so it can be shared. The intake form (`src/app/intake/page.tsx`) gains two optional fields (`websiteUrl`, `location`) appended to the existing `FormData` POST to `/api/drive`. That route, after its existing Drive upload + fulfillment-task creation, soft-fail-calls `extractBrandFromUrl()` (if `websiteUrl` given) and `generateMasterCampaign()` (if `location` + `offerDetails` given), returning `portalUrl` and `campaignPackage` in the JSON response.

**Tech Stack:** Next.js API routes, TypeScript, Zod (via existing `sandboxPrompts.ts` schemas), Prisma (unchanged).

## Global Constraints

- No test framework exists in this repo (`package.json` has no `test` script) — verification is `npx tsc --noEmit`, not unit tests. This matches the approved spec, which explicitly calls out no new tests.
- Brand extraction and campaign generation are soft-fail: a thrown error in either must not turn a successful Drive upload into a 500 response.
- Don't touch the existing `fulfillmentTask` creation block in `src/app/api/drive/route.ts` — it's already soft-fail and out of scope.
- Follow existing form input styling in `src/app/intake/page.tsx` exactly (same classes as the `offerDetails` field).

---

### Task 1: Extract `generateMasterCampaign()` into `src/lib/masterCampaign.ts`

**Files:**
- Create: `src/lib/masterCampaign.ts`
- Modify: `src/app/api/sandbox/master-campaign/route.ts`

**Interfaces:**
- Consumes: `MASTER_CAMPAIGN_PROMPT`, `callOpenAiJson`, `mockMasterCampaignPackage`, `MasterCampaignPackageSchema`, `MasterCampaignPackage`, `BrandDna` — all already exported from `src/lib/sandboxPrompts.ts` (verified at lines 105-113, 168, 988-1000, 1002).
- Produces: `generateMasterCampaign(location: string, promoOffer: string, brandDna?: BrandDna): Promise<MasterCampaignPackage>` — thrown `Error('location and promoOffer are required')` when either is blank. Later tasks (Task 3) call this.

- [ ] **Step 1: Write `src/lib/masterCampaign.ts`**

```ts
import {
  MASTER_CAMPAIGN_PROMPT,
  callOpenAiJson,
  mockMasterCampaignPackage,
  MasterCampaignPackageSchema,
  type MasterCampaignPackage,
  type BrandDna,
} from '@/lib/sandboxPrompts';

export async function generateMasterCampaign(
  location: string,
  promoOffer: string,
  brandDna?: BrandDna,
): Promise<MasterCampaignPackage> {
  if (!location || !promoOffer) {
    throw new Error('location and promoOffer are required');
  }

  const userContext = `Location: ${location}\nPromo offer: ${promoOffer}`;

  return callOpenAiJson(
    MASTER_CAMPAIGN_PROMPT,
    userContext,
    () => mockMasterCampaignPackage(location, promoOffer),
    0.7,
    MasterCampaignPackageSchema,
    brandDna,
  );
}
```

- [ ] **Step 2: Update `src/app/api/sandbox/master-campaign/route.ts` to use the extracted function**

Replace the full file contents with:

```ts
import { NextResponse } from 'next/server';
import { generateMasterCampaign } from '@/lib/masterCampaign';

export async function POST(req: Request) {
  try {
    const { location, promoOffer, activeBrandDna } = await req.json();
    if (!location || !promoOffer) {
      return NextResponse.json({ error: 'location and promoOffer are required' }, { status: 400 });
    }

    const result = await generateMasterCampaign(location, promoOffer, activeBrandDna);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox master-campaign error:', err);
    return NextResponse.json({ error: err.message || 'Campaign generation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `masterCampaign.ts` or `sandbox/master-campaign/route.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/masterCampaign.ts src/app/api/sandbox/master-campaign/route.ts
git commit -m "refactor: extract generateMasterCampaign into shared lib"
```

---

### Task 2: Add `websiteUrl` and `location` fields to the intake form

**Files:**
- Modify: `src/app/intake/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `FormData` posted to `/api/drive` now includes `websiteUrl` and `location` keys, which Task 3's route reads via `formData.get('websiteUrl')` / `formData.get('location')`.

- [ ] **Step 1: Add state**

In `IntakeFormContent`, next to the existing `offerDetails` state (around line 18):

```tsx
const [offerDetails, setOfferDetails] = useState('');
const [websiteUrl, setWebsiteUrl] = useState('');
const [location, setLocation] = useState('');
```

- [ ] **Step 2: Append to `FormData` in `handleSubmit`**

Immediately after `formData.append('offerDetails', offerDetails);` (around line 47):

```tsx
formData.append('clientName', clientName);
formData.append('offerDetails', offerDetails);
formData.append('websiteUrl', websiteUrl);
formData.append('location', location);
```

- [ ] **Step 3: Render the two inputs**

Insert directly after the "Offer Details" `<div className="space-y-1.5">...</div>` block (around line 155, right before the "Drag & Drop Upload Zone" comment):

```tsx
{/* Website URL */}
<div className="space-y-1.5">
  <label className="text-xs font-semibold text-slate-300 block">
    Website URL
  </label>
  <input
    type="text"
    value={websiteUrl}
    onChange={(e) => setWebsiteUrl(e.target.value)}
    placeholder="e.g. https://apexmechanical.com"
    className="w-full bg-[#0E131F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
  />
</div>

{/* Location */}
<div className="space-y-1.5">
  <label className="text-xs font-semibold text-slate-300 block">
    Location
  </label>
  <input
    type="text"
    value={location}
    onChange={(e) => setLocation(e.target.value)}
    placeholder="e.g. Austin, TX"
    className="w-full bg-[#0E131F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
  />
</div>
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/intake/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: add website URL and location fields to intake form"
```

---

### Task 3: Wire brand extraction and campaign generation into `/api/drive`

**Files:**
- Modify: `src/app/api/drive/route.ts`

**Interfaces:**
- Consumes: `extractBrandFromUrl(url: string): Promise<ExtractedBrandIdentity>` from `src/lib/brandExtractor.ts`; `toBrandDna(identity: ExtractedBrandIdentity): BrandDna` from `src/lib/sandboxPrompts.ts`; `generateMasterCampaign(location, promoOffer, brandDna?): Promise<MasterCampaignPackage>` from Task 1's `src/lib/masterCampaign.ts`.
- Produces: `/api/drive` POST response shape `{ success, folderId, folderUrl, portalUrl, uploadedCount, campaignPackage }`.

- [ ] **Step 1: Add imports**

At the top of `src/app/api/drive/route.ts`, alongside the existing imports:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { extractBrandFromUrl } from '@/lib/brandExtractor';
import { toBrandDna, type BrandDna, type MasterCampaignPackage } from '@/lib/sandboxPrompts';
import { generateMasterCampaign } from '@/lib/masterCampaign';
```

- [ ] **Step 2: Read the two new fields from `formData`**

Right after the existing `const offerDetails = ...` line (currently line 28):

```ts
const clientName = (formData.get('clientName') as string) || 'New Client';
const offerDetails = (formData.get('offerDetails') as string) || '';
const websiteUrl = (formData.get('websiteUrl') as string) || '';
const location = (formData.get('location') as string) || '';
const files = formData.getAll('files') as File[];
```

- [ ] **Step 3: Run brand extraction + campaign generation after the existing `fulfillmentTask` try/catch block**

The existing block ends around line 100 (`catch (dbError) { console.error(...); }`). Immediately after that closing brace, before the `return NextResponse.json({...})`, add:

```ts
// 4. Mine Brand DNA from the client's site and draft their 30-Day Master
// Campaign. Both are soft-fail: the Drive upload above already succeeded,
// so an LLM/network hiccup here must not turn a successful intake into an
// error response.
let brandDna: BrandDna | undefined;
if (websiteUrl) {
  try {
    brandDna = toBrandDna(await extractBrandFromUrl(websiteUrl));
  } catch (brandError) {
    console.error('Brand extraction failed (Drive upload still succeeded):', brandError);
  }
}

let campaignPackage: MasterCampaignPackage | null = null;
if (location && offerDetails) {
  try {
    campaignPackage = await generateMasterCampaign(location, offerDetails, brandDna);
  } catch (campaignError) {
    console.error('Master campaign generation failed (Drive upload still succeeded):', campaignError);
  }
}
```

- [ ] **Step 4: Update the success response**

Replace:

```ts
    return NextResponse.json({
      success: true,
      folderId: clientFolderId,
      folderUrl: folderViewLink,
      uploadedCount: uploadedFileIds.length,
    });
```

with:

```ts
    return NextResponse.json({
      success: true,
      folderId: clientFolderId,
      folderUrl: folderViewLink,
      portalUrl: new URL('/admin', req.url).toString(),
      uploadedCount: uploadedFileIds.length,
      campaignPackage,
    });
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: zero type errors across the whole project.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/drive/route.ts
git commit -m "feat: wire brand extraction and campaign generation into intake upload"
```

---

## Self-Review Notes

- Spec coverage: form fields (Task 2), extracted helper (Task 1), drive route wiring incl. `portalUrl`/`campaignPackage` (Task 3), `tsc --noEmit` verification (every task's final check) — all four spec sections covered.
- No placeholders: every step has literal code, exact file paths, and exact line anchors taken from the files as they exist now.
- Type consistency: `generateMasterCampaign(location, promoOffer, brandDna?)` signature is identical across Task 1's definition, Task 1 Step 2's sandbox route call, and Task 3 Step 3's drive route call. `MasterCampaignPackage` and `BrandDna` types are imported from the same source (`sandboxPrompts.ts`) everywhere they're used.
