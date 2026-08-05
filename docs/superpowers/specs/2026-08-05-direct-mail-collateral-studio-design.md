# Direct Mail & Collateral Studio — Design

## Goal

Add a "Direct Mail Studio" tool to the AI Creative Sandbox (`src/components/sandbox/`) that turns a brief (event details, offer, speakers, matching funds, etc.) into 3 audience-tailored direct mail variants, each rendered as a real-looking, exportable mail piece — a 4x6 postcard (front + back) or an 8.5x11 letter, with a QR code and the client's brand color.

## Data layer (`src/lib/sandboxPrompts.ts`)

Following the existing pattern used by `MasterCampaignPackageSchema` / `mockMasterCampaignPackage`:

```ts
export const FormFactorOptions = ['postcard', 'letter'] as const;
export type FormFactor = (typeof FormFactorOptions)[number];

const PointOfContactSchema = z.object({
  name: z.string().catch(''),
  email: z.string().catch(''),
  phone: z.string().catch(''),
}).catch({ name: '', email: '', phone: '' });

const DirectMailVariantSchema = z.object({
  audienceName: z.string().catch(''),
  headline: z.string().catch(''),
  subheadline: z.string().catch(''),
  bodyCopy: z.string().catch(''),
  callToAction: z.string().catch(''),
  urgencyDriver: z.string().catch(''),
  pointOfContact: PointOfContactSchema,
  eventDetailsSummary: z.string().catch(''),
}).catch({
  audienceName: '', headline: '', subheadline: '', bodyCopy: '',
  callToAction: '', urgencyDriver: '', pointOfContact: { name: '', email: '', phone: '' },
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

`DIRECT_MAIL_PROMPT` instructs the model it's writing physical direct-mail copy, not digital ads:
- **postcard**: headline/subheadline/body must be extremely tight — a postcard is read in a few seconds on the way to the trash or the fridge.
- **letter**: fuller persuasive paragraphs in a business-fundraising-letter voice, read at a kitchen table.
- Write exactly one variant per audience in the input list, in the order given, each genuinely angled to that audience's relationship to the org (e.g. a business-owner variant leans into a sponsorship/partnership angle; a past-donor variant leans into a renewal/impact angle).
- Output must match `DirectMailPackageSchema` exactly.

`mockDirectMailPackage(briefText, formFactor, audiences, qrUrl)` — `[MOCK]`-prefixed synthetic variants for every audience, same convention as every other sandbox mock (`mockMasterCampaignPackage`, `mockGeoExpansionPackage`, etc.). This route **keeps** the mock fallback — unlike the brand-identity scraper (which was explicitly de-mocked because it claims to reflect a real live site), this tool is straightforward synthetic copy generation like the rest of the sandbox, so the house convention (testable without a paid key) applies.

`validateDirectMailInput(body)` mirrors `validateLandingPageInput`:
- `briefText`: required, non-empty string
- `formFactor`: must be `'postcard'` or `'letter'`
- `audiences`: required array, at least 1 non-empty string entry
- `qrUrl`: required, non-empty string

## API layer

`src/lib/directMail.ts` — thin wrapper mirroring `src/lib/masterCampaign.ts`:

```ts
export async function generateDirectMailPackage(
  briefText: string,
  formFactor: FormFactor,
  audiences: string[],
  qrUrl: string,
  brandDna?: BrandDna,
): Promise<DirectMailPackage> {
  const userContext = [
    `Form factor: ${formFactor === 'postcard' ? '4x6 postcard (front/back)' : '8.5x11 letter'}`,
    `Target audiences (write one variant per audience, in this order): ${audiences.join(', ')}`,
    `Brief:`,
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

`src/app/api/sandbox/direct-mail/route.ts` — thin route mirroring `src/app/api/sandbox/master-campaign/route.ts`: validates, delegates, and echoes `formFactor`/`qrUrl` from the request straight into the response (never trusts the model to echo the URL back verbatim).

```ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateDirectMailInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await generateDirectMailPackage(
      body.briefText, body.formFactor, body.audiences, body.qrUrl, body.activeBrandDna,
    );
    return NextResponse.json({ success: true, ...result, formFactor: body.formFactor, qrUrl: body.qrUrl });
  } catch (err: any) {
    console.error('Sandbox direct-mail error:', err);
    return NextResponse.json({ error: err.message || 'Direct mail generation failed' }, { status: 500 });
  }
}
```

**Deviation from the original ask:** no `organizationId` round-trip on this route. Every existing sandbox tool already splits brand context into two independent concerns, and this tool stays consistent with them rather than introducing a third pattern:
- **Voice/tone** flows in as `activeBrandDna` — already-loaded client-side state shared across the whole sandbox (set via Brand Identity Miner or the Brand DNA drawer), same as Master Campaign, Copy Studio, Ad Builder, etc.
- **Visual accent color** comes from a per-panel organization dropdown that already fetches `primaryColor`/`logoUrl` client-side (same pattern as `AdBuilderPanel` → `AdMockupCard`) — it only feeds the mockup's rendering, so it never needs to reach the server.

## Components

`src/components/sandbox/DirectMailPostcardMockup.tsx` — presentational, two `forwardRef` capture targets (front/back), `aspect-[3/2]` (6in x 4in):
- **Front**: brand-color accent treatment, `headline`, `subheadline`, org logo if present.
- **Back**: left column is the "message" (`bodyCopy`, `urgencyDriver`, `callToAction` styled as a button block, `eventDetailsSummary`, point-of-contact line); right column is postcard-back chrome — a dashed address-block placeholder, a "PLACE STAMP HERE" indicia box, and the org name as return address. QR code (`react-qr-code`, already a dependency — see `flyer-generator/page.tsx`) sits above the address block, pointing at `qrUrl`.

`src/components/sandbox/DirectMailLetterMockup.tsx` — presentational, single `forwardRef` capture target, 8.5x11 portrait, business-letter format: letterhead (logo/org name + today's date) at top, `headline`/`subheadline` as an opening hook line, `bodyCopy` as flowing paragraphs, `urgencyDriver` as a P.S. line, signed by `pointOfContact` (name/email/phone), QR code + `callToAction` near the bottom.

Both mockups are pure presentational components — `{ variant, brandColor, logoUrl, orgName, qrUrl }` in, no fetching, no internal state — same shape as the existing `AdMockupCard`.

`src/components/sandbox/DirectMailPanel.tsx` — orchestrator, wired like `AdBuilderPanel` + `MasterCampaignPanel` combined:
- Org dropdown (fetches `/api/sandbox/organizations`, drives `brandColor`/`logoUrl`/`orgName` for the mockups only — client-side only, never sent to the API)
- `briefText` textarea
- Form factor toggle (Postcard / Letter)
- Editable audience list — 3 inputs pre-filled with the defaults (`Business Owners`, `Past Individual Donors`, `Reach Program Donors`), user can rename, add, or remove down to a minimum of 1
- `qrUrl` input
- Generate button → `POST /api/sandbox/direct-mail`, sending `activeBrandDna` (prop threaded from the sandbox page, same as every other panel)
- Once generated: variant tabs (one per audience, same pattern as Master Campaign's channel tabs) showing that variant's mockup
- Export controls, per the active variant:
  - **Download PNG** — `html2canvas-pro` (see `flyer-generator/page.tsx` for the oklch-color-safe capture pattern this repo already established), captures front+back as two PNG files for postcard, one PNG for letter
  - **Download PDF** — `jsPDF`, one PDF file: 2 landscape pages sized `[6, 4]` inches for postcard (front, then back), 1 portrait `letter`-sized page for letter
  - **Export All Copy (JSON)** — top-level button dumping the full `DirectMailPackage` (all variants, not just the active tab), same convention as Brand Identity Miner's JSON export

## Page wiring

- `src/components/sandbox/types.ts`: add `'direct-mail'` to the `SandboxTool` union.
- `src/app/(sandbox)/sandbox/page.tsx`: add a tab (`Mail` icon from `lucide-react`), render `<DirectMailPanel activeBrandDna={activeBrandDna} />` in the draft view — same slot pattern as every other tab.
- No staging/scoring integration. Bundle tools that generate multiple variants at once (Master Campaign, Compliance Audit, Brand Identity) are export-only in this codebase, not saved as `CreativeAsset` records — Direct Mail Studio follows that same convention rather than extending `ScorableType`.

## Error handling

Same shape as every other sandbox route: 400 for validation failures (missing brief / bad form factor / empty audiences / missing QR URL), 500 with `err.message` for generation failures, surfaced client-side via `sonner` toast (same as every other panel). Export failures (`html2canvas`/`jsPDF`) are caught and toasted individually per the `flyer-generator` precedent; a failed export doesn't clear the already-generated package or block re-export.

## Testing

No test framework exists for sandbox tools in this repo — none of the sibling panels (Master Campaign, Landing Page Studio, Brand Identity, Compliance Audit) have tests. Verification is `npx tsc --noEmit`, `npm run build`, and manually exercising the dev server: generate a package, toggle form factors, edit the audience list, and run both export paths — consistent with how the rest of this sandbox has been built and verified.
