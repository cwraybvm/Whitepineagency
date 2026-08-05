# Sandbox Prompt Few-Shot Exemplar Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `COPY_AD_EXEMPLARS_BLOCK` and `VIDEO_EXEMPLARS_BLOCK` to `src/lib/sandboxPrompts.ts` and splice them into `SYSTEM_PROMPTS.copy/ad/video` and `MATRIX_PROMPT`.

**Architecture:** Two new module-private string constants, following the existing `FRAMEWORKS_BLOCK`/`RULES_BLOCK` pattern, interpolated via template literal into the 4 named prompts. `DCO_PROMPT`/`DRIP_PROMPT` untouched.

**Tech Stack:** TypeScript.

## Global Constraints
- Only `SYSTEM_PROMPTS.copy`, `SYSTEM_PROMPTS.ad`, `SYSTEM_PROMPTS.video`, `MATRIX_PROMPT` get an `<exemplars>` block. `DCO_PROMPT`/`DRIP_PROMPT` stay as they are.
- 2 examples per block (cost-bounded, confirmed with user).
- `<output>` in each `<example>` is plain copy text, never a JSON envelope.
- Final tag order per prompt: `<role>` → `<frameworks>` → `<exemplars>` → `<framework_angles>` (matrix only) → `<rules>` → `<output_format>`.
- No new exports besides the two block constants (both module-private, unexported — matches `FRAMEWORKS_BLOCK`/`RULES_BLOCK`/`NEGATIVE_RULES_BLOCK`). Existing exported names/types unchanged.

---

### Task 1: Add exemplar blocks and wire them into the 4 prompts

**Files:**
- Modify: `src/lib/sandboxPrompts.ts` (near `RULES_BLOCK`, and inside `SYSTEM_PROMPTS`, `MATRIX_PROMPT`)

**Interfaces:**
- Produces: `COPY_AD_EXEMPLARS_BLOCK: string`, `VIDEO_EXEMPLARS_BLOCK: string` (module-private).

- [ ] **Step 1: Add both blocks directly after `NEGATIVE_RULES_BLOCK`, before `RULES_BLOCK`**

```ts
const COPY_AD_EXEMPLARS_BLOCK = `<exemplars>
Use these gold-standard examples as reference for pacing, punchy sentence structure, and tone execution, but do not copy their specific industry facts or product names.

<example>
<context>HVAC company, offer: same-day AC repair during a heatwave.</context>
<framework>Pattern Interrupt</framework>
<output>Your AC picked the worst week to die. 97 degrees this weekend, and half the neighborhood already called. We've got same-day slots left today. One call, cold air by tonight. Book your slot.</output>
</example>

<example>
<context>Dental practice, offer: free whitening with a new-patient exam.</context>
<framework>AIDA</framework>
<output>Notice the gap between your smile and your photos? Fixable, this month. Full exam, cleaning, and whitening on us if you're new here before the 30th. Six new-patient slots left. Grab one.</output>
</example>
</exemplars>`;

const VIDEO_EXEMPLARS_BLOCK = `<exemplars>
Use these gold-standard examples as reference for pacing, punchy sentence structure, and tone execution, but do not copy their specific industry facts or product names.

<example>
<context>Roofing company, offer: free storm-damage inspection.</context>
<framework>PAS</framework>
<output>Hook (0-3s): close-up on a hail-dented shingle -- "That's not cosmetic. That's a leak in six months." Agitate: water stain spreading across a ceiling. Solution: inspector on the roof, pointing out damage on a clipboard. CTA: "Free storm inspection -- before your insurance window closes."</output>
</example>

<example>
<context>Landscaping company, offer: fall cleanup package.</context>
<framework>Pattern Interrupt</framework>
<output>Hook (0-3s): close-up on dead, patchy grass -- "Your lawn is dying and it's not even your fault." Agitate: reveal the real cause, city water restrictions cutting into normal mowing. Solution: crew aerating and overseeding the lawn. CTA: "Book your fall reset -- spots close October 1st."</output>
</example>
</exemplars>`;
```

- [ ] **Step 2: Wire into `SYSTEM_PROMPTS.copy` and `SYSTEM_PROMPTS.ad`** — insert `${COPY_AD_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `${RULES_BLOCK}` in both

Change (both `copy` and `ad` entries):
```ts
${FRAMEWORKS_BLOCK}

${RULES_BLOCK}
```
to:
```ts
${FRAMEWORKS_BLOCK}

${COPY_AD_EXEMPLARS_BLOCK}

${RULES_BLOCK}
```

- [ ] **Step 3: Wire into `SYSTEM_PROMPTS.video`** — insert `${VIDEO_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `${RULES_BLOCK}`

Same substitution pattern as Step 2, using `${VIDEO_EXEMPLARS_BLOCK}` in the `video` entry.

- [ ] **Step 4: Wire into `MATRIX_PROMPT`** — insert `${COPY_AD_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `<framework_angles>`

Change:
```ts
${FRAMEWORKS_BLOCK}

<framework_angles>
```
to:
```ts
${FRAMEWORKS_BLOCK}

${COPY_AD_EXEMPLARS_BLOCK}

<framework_angles>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Sanity script**

Write a throwaway `verify-exemplars.ts` at the repo root (same pattern as the prior two prompt tasks — import from `./src/lib/sandboxPrompts`, run with `npx tsx`, then delete it):

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
} from './src/lib/sandboxPrompts';

function countExamples(text: string): number {
  return (text.match(/<example>/g) || []).length;
}

const targeted: Record<string, string> = {
  'SYSTEM_PROMPTS.copy': SYSTEM_PROMPTS.copy,
  'SYSTEM_PROMPTS.ad': SYSTEM_PROMPTS.ad,
  'SYSTEM_PROMPTS.video': SYSTEM_PROMPTS.video,
  MATRIX_PROMPT,
};

for (const [name, text] of Object.entries(targeted)) {
  if (!text.includes('<exemplars>') || !text.includes('</exemplars>')) {
    throw new Error(`${name} missing <exemplars> block`);
  }
  const count = countExamples(text);
  if (count < 2) throw new Error(`${name} has ${count} <example> entries, expected at least 2`);
  console.log(`OK  ${name}: <exemplars> present with ${count} examples`);
}

for (const [name, text] of Object.entries({ DCO_PROMPT, DRIP_PROMPT })) {
  if (text.includes('<exemplars>')) throw new Error(`${name} should NOT have an <exemplars> block (out of scope)`);
  console.log(`OK  ${name}: no <exemplars> block, as expected`);
}

AssetDraftSchema.parse({ title: 't', content: 'c' });
AdBuilderSchema.parse({ title: 't', content: 'c', metadata: { headline: 'h', cta: 'c' } });
VideoLabSchema.parse({ title: 't', content: 'c', metadata: { beats: [{ scene: '1', shot: 's', line: 'l' }] } });
CopyStudioSchema.matrix.parse({ angles: [{ angle: 'Fear/Urgency', title: 't', content: 'c' }] });
console.log('OK  zod schemas still parse output_format shapes');

console.log('\nAll checks passed.');
```

Run: `npx tsx verify-exemplars.ts`
Expected: all `OK` lines print, then `All checks passed.` with no thrown error.

Then delete: `rm verify-exemplars.ts`

- [ ] **Step 7: Confirm diff scope**

Run: `git diff src/lib/sandboxPrompts.ts`
Expected: diff touches only `SYSTEM_PROMPTS`, `MATRIX_PROMPT`, plus the two new exemplar-block constants. `DCO_PROMPT`, `DRIP_PROMPT`, `SWIPE_VISION_PROMPT`, `REMIX_PROMPT`, `LANDING_PAGE_PROMPT`, `BRAND_EXTRACT_PROMPT`, `refineInstructions()` show no diff.

- [ ] **Step 8: Commit**

```bash
git add src/lib/sandboxPrompts.ts
git commit -m "feat: add few-shot exemplar bank to sandbox copy/ad/video/matrix prompts"
```
