# Sandbox Prompt Banned-Word Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `NEGATIVE_RULES_BLOCK` banned-word/anti-fluff fragment to `src/lib/sandboxPrompts.ts` and splice it into the `<rules>` block of all 6 sandbox system prompts.

**Architecture:** One new bare bullet-fragment constant (no wrapping `<rules>` tag) placed next to `RULES_BLOCK`. `RULES_BLOCK` gets it added as an extra bullet line; `DRIP_PROMPT` and `DCO_PROMPT` (which each define their own inline `<rules>` block) get it appended to their existing bullets. No schema or output-format changes.

**Tech Stack:** TypeScript.

## Global Constraints
- Banned list is exactly these 15, verbatim: elevated, revolutionary, seamless, game-changer, unlock your potential, dive into, nestle, hassle-free, synergy, delve, testament, beacon, supercharge, tapestry, spearhead.
- Only `<rules>` content changes. `<role>`, `<frameworks>`, `<framework_angles>`, `<output_format>` in all 6 prompts stay byte-identical to their current text.
- No new exported names besides `NEGATIVE_RULES_BLOCK`; existing exports (`SYSTEM_PROMPTS`, `MATRIX_PROMPT`, `DRIP_PROMPT`, `DCO_PROMPT`) keep their current names/types.

---

### Task 1: Add NEGATIVE_RULES_BLOCK and splice into all 6 prompts

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (near `RULES_BLOCK` definition, and inside `DRIP_PROMPT`/`DCO_PROMPT`'s inline `<rules>` blocks)

**Interfaces:**
- Produces: `NEGATIVE_RULES_BLOCK: string` (module-private, not exported — matches `FRAMEWORKS_BLOCK`/`RULES_BLOCK`, which are also unexported).

- [ ] **Step 1: Add `NEGATIVE_RULES_BLOCK` directly after the `RULES_BLOCK` definition**

```ts
const NEGATIVE_RULES_BLOCK = `- Never use any of these words/phrases or generic corporate jargon like them: elevated, revolutionary, seamless, game-changer, unlock your potential, dive into, nestle, hassle-free, synergy, delve, testament, beacon, supercharge, tapestry, spearhead.
- Use clear, grounded, everyday language a real direct-response copywriter would actually write.`;
```

- [ ] **Step 2: Add it into `RULES_BLOCK`'s existing `<rules>` tag** (this reaches `SYSTEM_PROMPTS.copy/ad/video` and `MATRIX_PROMPT`, all 4 of which interpolate `${RULES_BLOCK}`)

Change:
```ts
const RULES_BLOCK = `<rules>
- Short, punchy sentences.
- Conversational tone, never a wall-of-text paragraph.
- One idea per line/sentence.
</rules>`;
```
to:
```ts
const RULES_BLOCK = `<rules>
- Short, punchy sentences.
- Conversational tone, never a wall-of-text paragraph.
- One idea per line/sentence.
${NEGATIVE_RULES_BLOCK}
</rules>`;
```

- [ ] **Step 3: Append it inside `DRIP_PROMPT`'s inline `<rules>` block**

Change:
```ts
<rules>
- Write a 3-step follow-up drip sequence (Day 1, Day 3, Day 7) for a lead who requested a quote but has not yet responded.
- Each step should escalate gently: reminder, value-add, final nudge.
- Specify SMS or Email as the channel for each step.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
</rules>
```
to:
```ts
<rules>
- Write a 3-step follow-up drip sequence (Day 1, Day 3, Day 7) for a lead who requested a quote but has not yet responded.
- Each step should escalate gently: reminder, value-add, final nudge.
- Specify SMS or Email as the channel for each step.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
${NEGATIVE_RULES_BLOCK}
</rules>
```
(as a template-literal interpolation `${NEGATIVE_RULES_BLOCK}`, same as Step 2 — `DRIP_PROMPT` is itself a template literal already)

- [ ] **Step 4: Append it inside `DCO_PROMPT`'s inline `<rules>` block**

Change:
```ts
<rules>
- You will be given a base offer/hook, a list of locations, and a list of audience segments.
- For EVERY combination of location and segment, write one distinct copy variant that naturally swaps in that location's geo-reference and that segment's demographic trigger/pain-point.
- Same base offer, localized and personalized language.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
</rules>
```
to:
```ts
<rules>
- You will be given a base offer/hook, a list of locations, and a list of audience segments.
- For EVERY combination of location and segment, write one distinct copy variant that naturally swaps in that location's geo-reference and that segment's demographic trigger/pain-point.
- Same base offer, localized and personalized language.
- Short, punchy sentences. Conversational tone, never a wall-of-text paragraph.
${NEGATIVE_RULES_BLOCK}
</rules>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Sanity script — all 6 prompts carry the banned list, schemas still parse**

Write a throwaway `verify-banned-words.ts` at the repo root (same pattern as the prior prompt-refactor task's `verify-prompts.ts` — import from `./src/lib/sandboxPrompts`, run with `npx tsx`, then delete it):

```ts
import {
  SYSTEM_PROMPTS,
  MATRIX_PROMPT,
  DCO_PROMPT,
  DRIP_PROMPT,
  AssetDraftSchema,
  AdBuilderSchema,
  VideoLabSchema,
  CopyStudioSchema,
  DripSchema,
} from './src/lib/sandboxPrompts';

const BANNED = [
  'elevated', 'revolutionary', 'seamless', 'game-changer', 'unlock your potential',
  'dive into', 'nestle', 'hassle-free', 'synergy', 'delve', 'testament', 'beacon',
  'supercharge', 'tapestry', 'spearhead',
];

const prompts: Record<string, string> = {
  'SYSTEM_PROMPTS.copy': SYSTEM_PROMPTS.copy,
  'SYSTEM_PROMPTS.ad': SYSTEM_PROMPTS.ad,
  'SYSTEM_PROMPTS.video': SYSTEM_PROMPTS.video,
  MATRIX_PROMPT,
  DRIP_PROMPT,
  DCO_PROMPT,
};

for (const [name, text] of Object.entries(prompts)) {
  for (const word of BANNED) {
    if (!text.toLowerCase().includes(word)) throw new Error(`${name} missing banned word: ${word}`);
  }
  console.log(`OK  ${name}: all ${BANNED.length} banned words present`);
}

AssetDraftSchema.parse({ title: 't', content: 'c' });
AdBuilderSchema.parse({ title: 't', content: 'c', metadata: { headline: 'h', cta: 'c' } });
VideoLabSchema.parse({ title: 't', content: 'c', metadata: { beats: [{ scene: '1', shot: 's', line: 'l' }] } });
CopyStudioSchema.matrix.parse({ angles: [{ angle: 'Fear/Urgency', title: 't', content: 'c' }] });
CopyStudioSchema.dco.parse({ variants: [{ location: 'loc', segment: 'seg', title: 't', content: 'c' }] });
DripSchema.parse({ title: 't', content: 'c', metadata: { steps: [{ day: 'Day 1', channel: 'SMS', content: 'c' }] } });
console.log('OK  zod schemas still parse output_format shapes');

console.log('\nAll checks passed.');
```

Run: `npx tsx verify-banned-words.ts`
Expected: all `OK` lines print, then `All checks passed.` with no thrown error.

Then delete the throwaway script: `rm verify-banned-words.ts`

- [ ] **Step 7: Confirm only the intended prompts changed**

Run: `git diff src/lib/sandboxPrompts.ts`
Expected: diff touches only `RULES_BLOCK`, `DRIP_PROMPT`, `DCO_PROMPT`, plus the new `NEGATIVE_RULES_BLOCK` constant. `SWIPE_VISION_PROMPT`, `REMIX_PROMPT`, `LANDING_PAGE_PROMPT`, `BRAND_EXTRACT_PROMPT`, `refineInstructions()` show no diff.

- [ ] **Step 8: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add banned-word/anti-fluff guardrails to sandbox system prompts"
```
