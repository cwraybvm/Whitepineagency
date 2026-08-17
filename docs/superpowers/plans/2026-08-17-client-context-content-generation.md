# Client-Context-Aware Content Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing AI content generator (`ContentStudio` + `/api/ai/generate-content`) use a specific client's brand voice and recent meeting notes when generating content, surfaced as a new tab on the client detail page.

**Architecture:** Extend the existing Gemini prompt-building step in `/api/ai/generate-content/route.ts` with a client-context lookup (Organization brand fields + recent ClientMeeting notes). Wire the existing, unmodified `ContentStudio` component into a new tab on `/admin/clients/[id]`. No new models, no new components beyond one tab entry.

**Tech Stack:** Next.js API routes, Prisma, `@google/genai` (Gemini) — all already in use in the touched files.

## Global Constraints

- No new npm dependencies.
- No new Prisma models or schema changes — `Organization.brandVoice`/`brandGuidelines` and `ClientMeeting` already exist.
- Every existing caller of `/api/ai/generate-content` that doesn't resolve to a real `Organization` row must see byte-identical output to today — context injection is additive, never a behavior change for those callers.
- Context-lookup failures (DB errors) must degrade to today's behavior (generate without that context), never fail the whole request.
- No automated test framework exists in this repo — verification is manual: dev server + curl, not automated tests.
- Prisma client singleton is `import { prisma } from '@/lib/prisma'` — never `new PrismaClient()`.

---

### Task 1: Inject client context into the generate-content prompt

**Files:**
- Modify: `src/app/api/ai/generate-content/route.ts`

**Interfaces:**
- Consumes: `prisma.organization` (`brandVoice`, `brandGuidelines`, `name` fields — all pre-existing), `prisma.clientMeeting` (`title`, `bodyMarkdown`, `meetingDate` — pre-existing, added in the client-management-modules plan).
- Produces: no new exports — this task changes the request-handling logic inside the existing `POST` handler only. The route's request/response shape is unchanged (`{ sourceNotes, clientName, organizationId }` in; the same generated-pack JSON out).

- [ ] **Step 1: Read the current route file to confirm line numbers before editing**

`src/app/api/ai/generate-content/route.ts` currently looks like this (lines 1-33):

```typescript
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '@/lib/prisma';

// ⚡ Force dynamic execution so Next.js doesn't try to evaluate Gemini API key statically during build
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const { sourceNotes, clientName, organizationId = 'default-org' } = await req.json();

    if (!sourceNotes) {
      return NextResponse.json({ error: 'Source notes are required' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an elite content strategist and social media director for ${clientName || 'TRK Ministries'}.
      Transform the provided sermon notes, teaching bullet points, or transcript into a complete multi-channel release pack:

      SOURCE CONTENT:
      ${sourceNotes}`,
```

Confirm your local copy matches before proceeding — if it's drifted, adapt the edits below to the actual surrounding code rather than blindly applying a diff.

- [ ] **Step 2: Add the context-fetching helper, right after the `sourceNotes` validation check and before the `ai.models.generateContent` call**

Insert this block between the `if (!sourceNotes) { ... }` check and the `const response = await ai.models.generateContent({` line:

```typescript
    // Client-context injection: brand voice/guidelines + recent meeting notes,
    // when organizationId resolves to a real client. Failures here degrade to
    // today's behavior (generate without this context) rather than failing
    // the request — the generation itself is the valuable part.
    let resolvedClientName = clientName;
    let contextBlock = '';
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, brandVoice: true, brandGuidelines: true },
      });

      if (org) {
        if (!resolvedClientName) resolvedClientName = org.name;

        const contextParts: string[] = [];
        if (org.brandVoice) contextParts.push(`Brand voice: ${org.brandVoice}`);
        if (org.brandGuidelines) contextParts.push(`Brand guidelines: ${org.brandGuidelines}`);

        const recentMeetings = await prisma.clientMeeting.findMany({
          where: { organizationId },
          orderBy: { meetingDate: 'desc' },
          take: 3,
          select: { title: true, bodyMarkdown: true },
        });

        if (recentMeetings.length > 0) {
          const meetingSummaries = recentMeetings
            .map((m) => `- ${m.title}: ${(m.bodyMarkdown || '').slice(0, 200)}`)
            .join('\n');
          contextParts.push(`Recent client meeting notes:\n${meetingSummaries}`);
        }

        if (contextParts.length > 0) {
          contextBlock = `\n\nCLIENT CONTEXT (use this to match tone and stay consistent with recent client conversations):\n${contextParts.join('\n\n')}`;
        }
      }
    } catch (err) {
      console.error('[GENERATE_CONTENT] client context lookup failed (non-fatal)', err);
    }
```

- [ ] **Step 3: Use `resolvedClientName` and `contextBlock` in the prompt**

Replace the `contents` template literal (the `You are an elite content strategist...` block) with:

```typescript
      contents: `You are an elite content strategist and social media director for ${resolvedClientName || 'TRK Ministries'}.
      Transform the provided sermon notes, teaching bullet points, or transcript into a complete multi-channel release pack:

      SOURCE CONTENT:
      ${sourceNotes}${contextBlock}`,
```

The only changes from the original: `clientName` → `resolvedClientName`, and `${contextBlock}` appended after `${sourceNotes}` (it's `''` when there's no context to inject, so this is a no-op string concatenation for every caller that doesn't resolve to a real org — byte-identical prompt to today).

- [ ] **Step 4: Verify the change compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Verify manually with curl**

Start the dev server (`npm run dev`), then:

```bash
# Baseline: an org with no brandVoice/meetings — should behave like today (no context block sent to Gemini; verify by temporarily logging `contextBlock` server-side, or by checking the generated tone doesn't reference any brand specifics)
curl -X POST http://localhost:3000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -d '{"sourceNotes":"Test sermon notes about generosity.","organizationId":"nonexistent-org-id"}'
```

Expected: 200, a full generated pack, `clientName` in the prompt falls back to `'TRK Ministries'` exactly as before this change (since `org` lookup returns `null` for a nonexistent ID, `resolvedClientName` stays whatever was passed in — `undefined` here, so the `|| 'TRK Ministries'` fallback fires).

```bash
# With a real client that has brandVoice set (pick a real organizationId from GET /api/clients — you'll need the role=OWNER cookie from POST /api/auth/login first, see prior task briefs in this repo's docs/superpowers/plans/2026-08-07-client-management-modules.md for the exact curl pattern)
curl -X POST http://localhost:3000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -d '{"sourceNotes":"Test sermon notes about generosity.","organizationId":"<real-org-id-with-brandVoice-set>"}'
```

Expected: 200, a full generated pack. To confirm the context block actually reached Gemini (not just that the route didn't error), temporarily add a `console.log(contextBlock)` right after Step 2's block, check the dev server log shows the expected brand voice/meeting text for that org, then remove the log before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai/generate-content/route.ts
git commit -m "feat: inject client brand voice and recent meeting notes into content generation"
```

---

### Task 2: Add Content tab to the client detail page

**Files:**
- Modify: `src/app/(admin)/admin/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `ContentStudio` component (`src/components/ContentStudio.tsx`), unchanged, already accepting `{ clientName: string; organizationId?: string }`. Consumes Task 1's route change indirectly (no direct dependency — this task works even if Task 1 hasn't landed, since `ContentStudio` already passes `organizationId` today).
- Produces: no new exports.

- [ ] **Step 1: Add the `ContentStudio` import**

In `src/app/(admin)/admin/clients/[id]/page.tsx`, add this import alongside the existing `ClientMeetingsTab`/`ExpensesTab` imports (after line 9):

```typescript
import ContentStudio from '@/components/ContentStudio';
```

- [ ] **Step 2: Add `'content'` to the `TabId` type and `TABS` array**

Replace line 17:
```typescript
type TabId = 'overview' | 'meetings' | 'expenses';
```
with:
```typescript
type TabId = 'overview' | 'meetings' | 'expenses' | 'content';
```

Replace lines 19-23:
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'meetings', label: 'Meeting Notes' },
  { id: 'expenses', label: 'Expenses' },
];
```
with:
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'meetings', label: 'Meeting Notes' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'content', label: 'Content' },
];
```

- [ ] **Step 3: Render `ContentStudio` for the new tab**

Add this line right after line 90 (`{tab === 'expenses' && <ExpensesTab clientId={client.id} />}`), before the closing `</div>`:

```typescript
      {tab === 'content' && <ContentStudio clientName={client.name} organizationId={client.id} />}
```

- [ ] **Step 4: Verify the change compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Verify in browser**

With the dev server running, log in as OWNER (see `src/app/api/auth/login/route.ts` — the `ADMIN_PASSWORD` bypass, or a real user login), visit `/admin/clients/<real-org-id>`. Expected: a 4th "Content" tab appears after Expenses. Click it. Expected: `ContentStudio`'s existing UI renders (source-notes textarea, generate button) — this is the same component already working elsewhere, so this step confirms only that it mounts correctly with this client's `name`/`id`, not that generation itself works (that's Task 1's Step 5). Type source notes, click generate, confirm a pack comes back and the tab doesn't error.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/clients/[id]/page.tsx"
git commit -m "feat: add Content tab to client detail page"
```

## Self-Review Notes

- **Spec coverage:** Task 1 covers the spec's "What changes" section 1 (route context injection) in full, including the fallback/degrade-gracefully requirement and the `clientName` fallback ordering. Task 2 covers section 2 (tab wiring) in full.
- **Type consistency:** `TabId` union and `TABS` array kept in sync in the same task/step. `ContentStudio`'s prop names (`clientName`, `organizationId`) match its existing, unmodified interface — verified against the component's current signature, not assumed.
- **No placeholders:** every step has the actual code to write and a concrete verification (tsc + curl/browser), no "add error handling" stubs.
