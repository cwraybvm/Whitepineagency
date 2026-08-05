# Sandbox Prompt Few-Shot Exemplar Bank

## Goal
Give the model concrete gold-standard direct-response examples to anchor pacing, sentence structure, and tone — on top of the abstract framework guidance already added in [[2026-08-05-sandbox-prompt-xml-frameworks-design]] and [[2026-08-05-sandbox-prompt-banned-words-design]].

## Scope
File: `src/lib/sandboxPrompts.ts`. Exactly the 4 prompts named in the task: `SYSTEM_PROMPTS.copy`, `SYSTEM_PROMPTS.ad`, `SYSTEM_PROMPTS.video`, `MATRIX_PROMPT`. `DCO_PROMPT` and `DRIP_PROMPT` are untouched — not named in the task, consistent with how the prior two prompt tasks scoped themselves.

## Cost tradeoff
Exemplars are sent as part of the system prompt on **every** generation call, not injected once — this is a real, recurring token/latency cost per request, not a one-time addition. Kept to 2 exemplars per block (confirmed with the user) to bound that cost while still giving the model a concrete pattern per surface.

## Approach
Two new shared string constants, following the existing `FRAMEWORKS_BLOCK`/`RULES_BLOCK` pattern (defined once, spliced via template literal):

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

`<output>` in each `<example>` is plain copy text, not a JSON envelope — keeps token cost down and avoids the model echoing the example's literal JSON keys back instead of generating its own.

### Wiring
- `SYSTEM_PROMPTS.copy`: add `${COPY_AD_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `${RULES_BLOCK}`.
- `SYSTEM_PROMPTS.ad`: same placement.
- `MATRIX_PROMPT`: add `${COPY_AD_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `<framework_angles>`.
- `SYSTEM_PROMPTS.video`: add `${VIDEO_EXEMPLARS_BLOCK}` between `${FRAMEWORKS_BLOCK}` and `${RULES_BLOCK}`.

Final tag order per prompt: `<role>` → `<frameworks>` → `<exemplars>` → `<framework_angles>` (matrix only) → `<rules>` → `<output_format>`.

## Testing
- `npx tsc --noEmit` — zero errors.
- Sanity script (same pattern as the prior two prompt tasks): assert `SYSTEM_PROMPTS.copy/ad/video` and `MATRIX_PROMPT` each contain an `<exemplars>` block with at least 2 `<example>` entries; assert `DCO_PROMPT`/`DRIP_PROMPT` do NOT contain `<exemplars>` (confirms scope stayed to the 4 named prompts); existing zod schemas still parse sample `<output_format>` shapes.
