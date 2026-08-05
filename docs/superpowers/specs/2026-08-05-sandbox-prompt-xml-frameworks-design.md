# Sandbox System Prompt XML/Framework Refactor

## Goal
Upgrade the system prompts behind Copy Studio, Ad Builder, Video Lab, and Campaign Batch so the model gets structured XML guidance (role/frameworks/rules/output_format) and explicit direct-response framework instruction (PAS, AIDA, BAB, Pattern Interrupt), producing sharper, better-structured copy.

## Scope
File: `src/lib/sandboxPrompts.ts`. Six exported prompt constants, confirmed by tracing every caller:

| Constant | Used directly by | Also used by Campaign Batch |
|---|---|---|
| `SYSTEM_PROMPTS.copy` | Copy Studio (single draft) | — |
| `SYSTEM_PROMPTS.ad` | Ad Builder | yes |
| `SYSTEM_PROMPTS.video` | Video Lab | yes |
| `MATRIX_PROMPT` | Copy Studio (matrix) | yes (angles) |
| `DCO_PROMPT` | Copy Studio (DCO) | — |
| `DRIP_PROMPT` | Campaign Batch only | yes |

Out of scope (not one of the four named panels, left untouched): `REMIX_PROMPT`, `SWIPE_VISION_PROMPT` (swipe/remix tool), `LANDING_PAGE_PROMPT`, `BRAND_EXTRACT_PROMPT`. `refineInstructions()` also untouched — it polishes existing content against an already-generated JSON shape, not an initial framework choice.

`ANGLES` (`['Fear/Urgency', 'Value/Savings', 'Social Proof', 'Scarcity', 'Direct/No-BS']`) stays as-is. It's imported by `src/components/sandbox/types.ts` for UI typing, so renaming the angle labels would ripple into badge/UI code outside this task's stated scope.

## Approach
Two shared string constants, spliced into each of the 6 prompts via template literals — matching the existing string-concatenation style already used for `MATRIX_PROMPT`/`DCO_PROMPT`. No new function/builder abstraction.

```ts
const FRAMEWORKS_BLOCK = `<frameworks>
Build the copy using ONE of these direct-response frameworks, whichever best fits the angle:
- PAS: Problem -> Agitate -> Solution
- AIDA: Attention -> Interest -> Desire -> Action
- BAB: Before -> After -> Bridge
- Pattern Interrupt: open with a counter-intuitive claim or a shocking industry stat
</frameworks>`;

const RULES_BLOCK = `<rules>
- Short, punchy sentences.
- Conversational tone, never a wall-of-text paragraph.
- One idea per line/sentence.
</rules>`;
```

Each prompt becomes:
```
<role>...specific role for this tool...</role>

${FRAMEWORKS_BLOCK}

${RULES_BLOCK}

<output_format>...the existing JSON shape text, unchanged, moved inside the tag...</output_format>
```

`<role>` text per prompt (all: "world-class direct-response copywriter specializing in high-ROAS digital campaigns for a local-service marketing agency", specialized per tool — ad = "paid-ads creative writer", video = "video script/storyboard writer", drip = "lifecycle/retention copywriter").

### MATRIX_PROMPT / DCO_PROMPT angle labeling
Add a `<framework_angles>` block mapping each existing `ANGLES` entry to a suggested framework, so the 5 (or N) variations stay structurally distinct instead of reading as re-worded versions of each other:
```
<framework_angles>
Fear/Urgency -> Pattern Interrupt or PAS
Value/Savings -> BAB
Social Proof -> AIDA
Scarcity -> Pattern Interrupt
Direct/No-BS -> PAS, blunt
</framework_angles>
```
DCO_PROMPT doesn't have a psychological-angle axis (it varies by location x segment, not by angle) — it gets `FRAMEWORKS_BLOCK`/`RULES_BLOCK` but no `<framework_angles>` block.

### DRIP_PROMPT
Same 4-tag skeleton, but the frameworks note is phrased as "apply where it fits the escalation stage" since the 3-step reminder -> value-add -> nudge structure is already fixed by the existing prompt text, not something the framework choice should override.

## Testing
- `npx tsc --noEmit` — zero errors.
- Zod schemas (`AssetDraftSchema`, `AdBuilderSchema`, `VideoLabSchema`, `CopyMatrixSchema`, `CopyDcoSchema`, `DripSchema`) are unchanged — only prompt text moves/changes, not the JSON contract, so no schema edits needed.
- Spot-check via mock fallbacks (no API key spend): hit `/api/sandbox/generate` (copy/ad/video/matrix/dco modes) and `/api/sandbox/campaign-batch` locally and confirm responses still parse.
- If a real provider key is configured, run one live generation per tool and read the output for sharper structure/framework adherence (qualitative, not automated).
