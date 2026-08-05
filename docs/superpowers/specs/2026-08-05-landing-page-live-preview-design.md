# Landing Page Studio — Live Preview, Device Toggles, Section AI, Deploy Design

**Goal:** Upgrade `LandingPageStudioPanel.tsx` from a plain-metadata edit form into a split-screen studio: left Inspector (generate controls + editable fields + section-level AI actions + export/deploy), right live-rendered HTML preview in a device-togglable iframe.

**Non-goals:** No change to the LLM's structured-field output shape (`heroHeadline`/`subheadline`/`primaryCta`/`valueProps`/`testimonial`) beyond one new optional field. No visual template picker — one fixed template. No persistence of deployed/exported state beyond the existing Staged Assets save.

## Architecture

### 1. `src/components/sandbox/landingPageHtml.ts` (new)

Pure function, no React:

```ts
export function renderLandingPageHtml(draft: LandingPageDraft, brandColor?: string | null): string
```

Returns a self-contained HTML document string: `<script src="https://cdn.tailwindcss.com"></script>` + a hero section (headline/subheadline/CTA button, styled with `brandColor` when present), value-prop bullets, testimonial block, and — when `draft.metadata.guaranteeBadge` is set — a small badge near the CTA. This one string is reused for the iframe preview, clipboard copy, file download, and the WordPress push body, so there is exactly one rendering path.

### 2. `LandingPageStudioPanel.tsx` (rewrite)

Layout becomes `grid-cols-[35%_65%]` (matches the panel's existing `380px_1fr` convention, widened to a percentage split per the request):

- **Left (Inspector):** existing Source/Brief/Org/Generate controls, then — once `draft` exists — the editable fields that today live in the right column (Hero Headline, Subheadline, Value Props, Testimonial, Primary CTA), each still using the existing `updateField`/`updateValueProp` helpers. Below the relevant fields: three section-AI buttons (Rewrite Hero Headline, Increase Urgency, Add Guarantee Badge). `ScoreBadge` and Save-to-Staged-Assets stay at the bottom, unchanged. Export/Deploy toolbar (below Save): Copy Clean HTML, Download HTML Bundle, Push to WordPress, Push to Webhook.
- **Right (Preview):** viewport toggle (Mobile 375px / Tablet 768px / Desktop 100%, local `useState<'mobile'|'tablet'|'desktop'>`), then `<iframe srcDoc={previewHtml} className="w-full h-full border-0" sandbox="allow-scripts">` inside a width-constrained wrapper driven by the toggle. `previewHtml = useMemo(() => renderLandingPageHtml(draft, selectedOrg?.primaryColor), [draft, organizationId])`, empty-state message when `!draft` (same tone as today's placeholder).

### 3. Section-level AI — `src/lib/sandboxPrompts.ts` (extend) + new route

- `SectionRefineSchema = z.object({ text: z.string().catch('') })`.
- `LANDING_PAGE_SECTION_REFINE_PROMPT`: instructs the model to rewrite a single supplied text field per a short instruction (e.g. "increase urgency using scarcity/timeliness language, keep roughly the same length"), returning `{"text": "..."}` only — no surrounding commentary.
- `mockSectionRefine(field: string, currentValue: string)`: `[MOCK]`-prefixed variant of `currentValue`, same fallback convention as every other mock function in the file.
- New route `src/app/api/sandbox/landing-page/refine-section/route.ts`: body `{ field: string, currentValue: string, instruction: string, organizationId?: string }` → validates `field`/`instruction` present (400 otherwise; `currentValue` may be `''`) → `brandClauseFor(organizationId)` + `callOpenAiJson(...)` → `{ success: true, text }`. All three section buttons call this route uniformly: Rewrite Hero Headline (`field: 'heroHeadline'`, current text as `currentValue`), Increase Urgency (`field: 'subheadline'`, current text as `currentValue`), Add Guarantee Badge (`field: 'guaranteeBadge'`, `currentValue: draft.metadata.guaranteeBadge || ''`, instruction asks for a short trust/risk-reversal badge line). Each button's response is written back via `updateField({ [field]: text })`.

### 4. `LandingPageDraft` type — `src/components/sandbox/types.ts` (extend)

`metadata` gains `guaranteeBadge?: string`.

### 5. WordPress page support — `src/app/api/wordpress/route.ts` (extend)

Add optional `postType?: 'posts' | 'pages'` to the request body, defaulting to `'posts'` (preserves `ContentStudio.tsx`'s current behavior unchanged); the fetch URL becomes `${cleanUrl}/wp-json/wp/v2/${postType ?? 'posts'}`. Landing Page Studio's deploy button always sends `postType: 'pages'`.

### 6. Webhook push — `src/lib/webhooks.ts` (extend) + new route

- `WebhookEvent` union gains `'landing_page.exported'`.
- New route `src/app/api/sandbox/landing-page/deploy-webhook/route.ts` (server-only, since `dispatchWebhookEvent` imports `prisma`): body `{ organizationId, title, html, metadata }` → validates `organizationId` present (400 otherwise, since the webhook target resolves from the org) → `dispatchWebhookEvent('landing_page.exported', { title, html, metadata }, organizationId)` → `{ success: true, delivered }`.

### 7. Deploy toolbar wiring — `LandingPageStudioPanel.tsx`

Both WordPress and Webhook buttons require `organizationId` selected (toast.error prompting to pick a client otherwise, since both resolve credentials/target server-side by org). WordPress push fetches creds client-side via `/api/organizations/credentials?organizationId=...` (same pattern `ContentStudio.tsx` already uses), then POSTs to `/api/wordpress`. Copy/Download use `renderLandingPageHtml` directly, no network call.

## Error handling

Same conventions as every existing sandbox panel: `toast.error(err.message || fallback)` on any non-OK fetch, per-action loading state (`refiningField: string | null`, `pushingWp`, `pushingWebhook` booleans), `finally` blocks reset loading state. `refine-section` and `deploy-webhook` routes follow the existing 400/500 pattern (`validate → 400`, upstream failure → `err.message || fallback`, `500`). `dispatchWebhookEvent` already swallows delivery failures internally and returns `delivered: boolean` rather than throwing — the route surfaces that as `{ success: true, delivered: false }`, and the panel shows a toast reflecting `delivered` rather than treating non-delivery as a request failure.

## Testing

- `npx tsc --noEmit` and `npm run build` — zero errors (explicitly requested).
- Manual: generate a draft, confirm iframe preview renders and updates live as Inspector fields are edited; toggle all 3 device widths; click each section-AI button with no LLM key set and confirm `[MOCK]` text lands in the field; click Add Guarantee Badge and confirm the badge appears in the preview; Copy Clean HTML and Download Bundle produce the expected string/file; with a test org that has WordPress creds configured, Push to WordPress creates a draft Page; Push to Webhook against an org with `webhookUrl` set delivers a `landing_page.exported` payload (verify via a request-bin style listener or existing scenario-runner pattern).
