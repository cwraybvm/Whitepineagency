# Sandbox Prompt Banned-Word / Negative-Constraint Guardrails

## Goal
Stop AI-buzzword/corporate-fluff language ("elevated", "seamless", "game-changer", etc.) from showing up in sandbox generations, across all 6 system prompts touched by [[2026-08-05-sandbox-prompt-xml-frameworks-design]].

## Scope
File: `src/lib/sandboxPrompts.ts`. Same 6 prompts as the prior XML/frameworks refactor: `SYSTEM_PROMPTS.copy`, `SYSTEM_PROMPTS.ad`, `SYSTEM_PROMPTS.video`, `MATRIX_PROMPT`, `DRIP_PROMPT`, `DCO_PROMPT`.

### The RULES_BLOCK / DRIP / DCO split
`RULES_BLOCK` is a shared constant spliced into 4 of the 6 prompts (copy/ad/video/matrix). `DRIP_PROMPT` and `DCO_PROMPT` each define their own inline `<rules>` block with task-specific bullets and don't reference `RULES_BLOCK`. The task's literal instruction ("update the shared `<rules>` block") only reaches 4 prompts; the task's stated goal ("across all sandbox generations") needs all 6. Resolution: extract the banned-word content into its own reusable fragment and splice it into all 6 `<rules>` blocks — one source of truth for the word list, no duplication.

## Approach

```ts
const NEGATIVE_RULES_BLOCK = `- Never use any of these words/phrases or generic corporate jargon like them: elevated, revolutionary, seamless, game-changer, unlock your potential, dive into, nestle, hassle-free, synergy, delve, testament, beacon, supercharge, tapestry, spearhead.
- Use clear, grounded, everyday language a real direct-response copywriter would actually write.`;
```

This is a bare bullet fragment (no wrapping `<rules>` tag), so it can be interpolated into any existing `<rules>...</rules>` block.

- `RULES_BLOCK` (used by copy/ad/video/matrix): add `${NEGATIVE_RULES_BLOCK}` as a new line inside its existing `<rules>` tag, after the current 3 bullets.
- `DRIP_PROMPT`'s inline `<rules>` block: add `${NEGATIVE_RULES_BLOCK}` after its existing 4 bullets.
- `DCO_PROMPT`'s inline `<rules>` block: add `${NEGATIVE_RULES_BLOCK}` after its existing 4 bullets.

No other content in any prompt changes. `<output_format>` JSON descriptions, `<role>`, `<frameworks>`, `<framework_angles>` are untouched.

## Testing
- `npx tsc --noEmit` — zero errors.
- Extend the same tag/schema sanity script used for the prior prompt refactor: assert all 6 prompt constants contain every one of the 15 banned words/phrases verbatim, and that the existing zod schemas still parse sample shapes matching each `<output_format>` (proves the edit didn't touch the output contract).
- No live-provider test required — the banned-word constraint's effectiveness against real model output is a qualitative check, not something a unit assertion can verify; leave to manual review if/when a real API key is available.
