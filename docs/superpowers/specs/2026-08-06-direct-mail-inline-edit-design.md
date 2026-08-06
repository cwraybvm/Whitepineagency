# Direct Mail Inline Click-to-Edit — Design

## Context

First sub-project of the "Creative Sandbox UX & Robustness Enhancements" roadmap (5 independent
features requested; decomposed per sub-project). This spec covers only inline `contentEditable`
editing directly on the Direct Mail visual mockups (`DirectMailPostcardMockup.tsx`,
`DirectMailLetterMockup.tsx`). Blog Studio inline editing is out of scope — its preview renders
inside a sandboxed `iframe srcDoc` built from a single Markdown blob, a fundamentally different
(harder) sync problem than editing plain DOM refs, and gets its own design pass later.

## Scope

Editable fields, matching `DirectMailVariant`: `headline`, `subheadline`, `bodyCopy`,
`callToAction`, `urgencyDriver` (rendered as a plain urgency line on the postcard, as "P.S. ..."
on the letter). Not editable: `eventDetailsSummary`, `pointOfContact`, `audienceName` — not
requested.

## Mechanism

Native `contentEditable` divs. Commit on `onBlur` only, never per-keystroke — reading stays
`variant.field` exactly as today; state doesn't change until blur, so React never re-renders the
node while the user is mid-edit (the standard safe pattern for `contentEditable` + React without a
rich-text library — avoids cursor-jump bugs).

## Data flow

New required prop `onEditField(field, value)` on both mockup components, typed against
`Pick<DirectMailVariant, 'headline' | 'subheadline' | 'bodyCopy' | 'callToAction' | 'urgencyDriver'>`.
`DirectMailPanel` owns a handler that updates `pkg.variants[activeVariantIndex][field]` via the
existing `setPkg` state — no new state container.

## Export

No export code changes. PNG/PDF capture already reads the live DOM via `frontRef` / `backRef` /
`letterRef` at click time (`html2canvas`), so edited text is already present when the user exports.

## Letter body copy

`bodyCopy` is currently split into one `<p>` per line for the letter. Rather than making each
paragraph independently editable (would require re-deriving paragraph boundaries on every edit),
the whole paragraph block becomes a single `contentEditable` region. Blur reads `innerText` back as
the full `bodyCopy` string; the next render re-splits it the same way it does today.

## Affordance

`cursor-text` class only. No Tailwind color/ring utility for a focus state — relies on the
browser's native focus outline, matching this file's existing constraint (top-of-file comment:
every color here is inline style, never a Tailwind color class, because Tailwind v4's `oklch()`
utilities can crash `html2canvas-pro`'s capture).

## Out of scope / skipped

- Blog Studio inline editing (separate sub-project).
- Placeholder-text pollution: blurring an untouched empty field commits the fallback string (e.g.
  `"Your headline appears here"`) into state. Only reachable if the AI already returned an empty
  field, which is already a visibly broken state pre-edit. Not engineered around; revisit if it's
  observed hitting a normally-populated field.
- Any edit-mode toggle — editing is always-on when a package exists, matching how the roadmap
  describes it ("click and edit text directly on the visual preview").

## Testing

`npx tsc --noEmit` clean. Live browser check: generate a direct mail package, click into each
editable field on both postcard and letter, edit, blur, confirm the variant tab switch preserves
edits, confirm PNG and PDF export reflect the edited text without re-generating.
