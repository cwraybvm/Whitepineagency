# Client-Context-Aware Content Generation — Design

## Context

Request: an "AI Content Generator." This app already has two content-generation systems:

1. **ContentStudio** (`src/components/ContentStudio.tsx`, mounted in `/admin`) — paste source notes, `POST /api/ai/generate-content` (Gemini) returns a full multi-channel pack (blog markdown, email draft, reel script, Instagram caption, Twitter thread, LinkedIn post, image prompt), persisted as a `ContentPost`, with direct-publish buttons to WordPress/Mailchimp/social.
2. **The `/sandbox` suite** — separate single-purpose generators (copy, ad, video, blog post, direct mail, landing page, brand identity, compliance audit, master campaign, swipe file).

Confirmed with the requester: the actual gap is that neither system uses a specific client's context (brand voice, recent history) when generating — `ContentStudio` already accepts `organizationId` but only uses it to save the resulting `ContentPost` and fetch integration credentials, never to inform the generation itself. The fix is a context injection into the existing pipeline, surfaced as a new tab on the client detail page built in the prior client-management-modules work — not a new generator, model, or route.

## What changes

**`src/app/api/ai/generate-content/route.ts`** — before building the Gemini prompt, when `organizationId` resolves to a real `Organization` (not the `'default-org'` fallback with no matching row, though that will simply return no context and behave as today):

- Fetch `Organization.name`, `brandVoice`, `brandGuidelines` (all already exist on the model, added for exactly this purpose per the schema's own comment: "Brand DNA — persona/voice notes injected into Creative Sandbox generation prompts").
- Fetch the 3 most recent `ClientMeeting` rows for that org (`orderBy: meetingDate desc, take: 3`), pulling `title` and `bodyMarkdown`.
- If either brand fields or meeting notes are present, prepend a "Client Context" block to the prompt sent to Gemini: brand voice/guidelines verbatim, and a short summary line per recent meeting (title + first ~200 chars of body, not the full markdown — keeps prompt size bounded regardless of how much a client's meeting notes grow).
- `clientName` in the prompt falls back to the fetched `Organization.name` when the caller didn't pass one explicitly (today it hardcodes `'TRK Ministries'` as the fallback — that becomes the last resort, not the default, once a real org name is available).
- All three lookups (org, meetings) are wrapped so a failure degrades to today's behavior (generate with whatever context succeeded, or none) rather than failing the request — the generation itself is the valuable part; missing brand context is a soft failure, not a hard one.
- Every existing caller of this route that doesn't pass a real `organizationId` (e.g. any dashboard usage still on `'default-org'` with no matching row) sees byte-identical behavior to today, since the new fetches simply return nothing to inject.

**`src/app/(admin)/admin/clients/[id]/page.tsx`** — add a 4th tab, `'content'`, alongside the existing `'overview' | 'meetings' | 'expenses'`, rendering `<ContentStudio clientName={client.name} organizationId={client.id} />` (both props `ContentStudio` already accepts, unchanged).

No schema changes. No new components beyond the one tab wiring — `ContentStudio` itself is not modified, since it already forwards `organizationId` to the route that now does something with it.

## Error handling

The org/meeting lookups sit in their own `try/catch` inside the route, separate from the Gemini call and the `ContentPost` save (which already has its own `.catch(() => null)`). A DB error fetching context never blocks generation.

## Testing

No automated test framework in this repo (confirmed project-wide). Manual verification: generate content for a client with `brandVoice` set and recent meeting notes, confirm the Gemini prompt (loggable server-side during dev) includes the context block; generate for a client with neither, confirm output is unchanged from pre-change behavior; confirm the existing non-client-specific call path (if any caller omits `organizationId` or passes `'default-org'`) still returns a 200 with no regression.
