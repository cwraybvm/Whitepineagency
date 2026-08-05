# Connect Client Intake Portal to Google Drive and Campaign Engine

## Goal

When a client submits the intake form, in addition to today's Drive upload + fulfillment task creation, the system should mine Brand DNA from their website (if provided) and generate a 30-Day Master Campaign package, returning it in the same response.

## Scope decisions

- Edit `src/app/intake/page.tsx` in place. No extraction to `src/components/intake/IntakeFormContent.tsx` — that path doesn't exist today and the form isn't reused elsewhere, so there's no benefit to moving it.
- `generateMasterCampaign()` is extracted into `src/lib/masterCampaign.ts` and used by both the existing sandbox route and the new drive route, so campaign-generation logic exists in exactly one place.
- Drive upload, brand extraction, and campaign generation all run synchronously in a single POST to `/api/drive`. No background job infra exists, and none is being introduced here.
- `portalUrl` in the response is a static link to the admin fulfillment board (`/admin`). No per-task filtering exists on that page today, and building one is out of scope.
- Brand extraction and campaign generation are soft-fail: if either throws (bad URL, LLM error, missing fields), the request still returns `success: true` with `campaignPackage: null`. Only a Drive upload failure is a hard error, matching the existing pattern where fulfillment-task creation is already soft-fail.

## 1. Form — `src/app/intake/page.tsx`

Add two new fields to `IntakeFormContent`, styled like the existing `offerDetails` textarea/input (no required asterisk — both optional):

- `websiteUrl` (text input, placeholder `"e.g. https://apexmechanical.com"`)
- `location` (text input, placeholder `"e.g. Austin, TX"`)

Both are appended to the `FormData` payload in `handleSubmit` alongside `clientName`, `offerDetails`, and `files`.

## 2. `src/lib/masterCampaign.ts` (new)

```ts
export async function generateMasterCampaign(
  location: string,
  promoOffer: string,
  brandDna?: BrandDna,
): Promise<MasterCampaignPackage>
```

Contains the `callOpenAiJson(MASTER_CAMPAIGN_PROMPT, ...)` call currently inline in `src/app/api/sandbox/master-campaign/route.ts` (including the `mockMasterCampaignPackage` fallback and `MasterCampaignPackageSchema` validation). Throws if `location` or `promoOffer` is blank, same validation the sandbox route already does — the caller decides whether that's fatal.

`src/app/api/sandbox/master-campaign/route.ts` is updated to call this function instead of duplicating the logic inline. Its request/response shape is unchanged.

## 3. `src/app/api/drive/route.ts`

After the existing Drive folder creation, file uploads, and `fulfillmentTask` creation (all unchanged):

1. Read `websiteUrl` and `location` from `formData` (both optional strings).
2. If `websiteUrl` is present:
   ```ts
   try {
     brandDna = toBrandDna(await extractBrandFromUrl(websiteUrl));
   } catch (err) {
     console.error('Brand extraction failed (intake still succeeds):', err);
   }
   ```
3. If `location` and `offerDetails` are both present:
   ```ts
   try {
     campaignPackage = await generateMasterCampaign(location, offerDetails, brandDna);
   } catch (err) {
     console.error('Master campaign generation failed (intake still succeeds):', err);
   }
   ```
4. Response becomes:
   ```ts
   {
     success: true,
     folderId: clientFolderId,
     folderUrl: folderViewLink,
     portalUrl: new URL('/admin', req.url).toString(),
     uploadedCount: uploadedFileIds.length,
     campaignPackage: campaignPackage ?? null,
   }
   ```

## 4. Verification

`npx tsc --noEmit` — zero type errors.

No new tests are added: this wires together three already-tested code paths (Drive upload, `extractBrandFromUrl`, campaign generation) with soft-fail try/catch around the two new calls. The existing soft-fail pattern for `fulfillmentTask` creation in this same route has no test either.
