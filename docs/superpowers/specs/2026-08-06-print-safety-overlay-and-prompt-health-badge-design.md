# Print Safety Overlay + Prompt Health Badge — Design

## Context

Third and fourth sub-projects of the "Creative Sandbox UX & Robustness Enhancements" roadmap,
bundled together since both are small and self-contained.

## Print Safety Overlay

Scope: `DirectMailPostcardMockup.tsx` only, matching the original roadmap's file scope. The letter
mockup is untouched.

**Guides render outside the ref'd capture subtree — no export-time toggling.** Front and back each
get a `relative` wrapper; `frontRef`/`backRef` keep pointing at the existing card div unchanged.
The guide layer is a new absolutely-positioned *sibling* on top of that div, not a descendant.
`html2canvas` only walks `frontRef.current` / `backRef.current`'s subtree for PNG/PDF export, so
the guides are structurally invisible to export — no need to flip a "hide guides" flag before
capture and restore it after.

Guides, all toggled by one switch:
- Red dashed border, `inset-[2%]` — bleed/trim line (≈0.125" on a 6"-wide card).
- Green dashed border, `inset-[6%]` — safe content area (≈0.25" safe margin).
- Gray shaded block, back only — the existing 180px "Postcard-back chrome" column (stamp box, QR
  code, recipient address block) already is the USPS address/barcode clearing zone; shaded in
  place rather than computing new geometry.

State: `showSafetyGuides` boolean in `DirectMailPanel`, default off, toggle button in the results
toolbar next to the export buttons, passed to `DirectMailPostcardMockup` as a prop. The guide layer
is `pointer-events-none` so it never blocks the existing `contentEditable` fields underneath.

## PromptHealthBadge

New file: `src/components/sandbox/PromptHealthBadge.tsx`. Reusable, non-blocking.

Props: `text: string`, `checkContactInfo?: boolean` (default `false`).

`useMemo` over `text`, regex-only (no new dependency), three indicators:
- 📧 Contact info — email or phone regex match. Rendered only when `checkContactInfo` is true.
- 🔗 CTA link — `https?://` or `www.` regex match.
- 📊 Brief quality — `Sparse` (<80 chars) / `Optimal` (80–400) / `Rich` (>400), fixed thresholds.

Purely advisory — never disables the Generate button in either caller.

Wiring:
- `DirectMailPanel`, below the Brief textarea, `checkContactInfo={true}`.
- `BlogPostStudioPanel`, below the Raw Notes/Draft textarea, `checkContactInfo={false}` (a blog
  draft has no inherent reason to carry a phone number).

## Out of scope / skipped

- Per-platform character-limit awareness — already `CharLimitBadges.tsx`'s job, not duplicated
  here.
- Configurable quality thresholds — fixed constants; add a prop if a second caller needs different
  numbers.
- Letter mockup safety guides — not in the original roadmap's file scope.

## Testing

`npx tsc --noEmit` clean, `npm run build` clean. Live browser check: toggle Print Safety Guide on
the postcard, confirm red/green dashed borders and gray back-chrome shading appear and don't shift
existing editable text; export PNG/PDF with guides on and confirm the exported image has no guide
lines. Type a Direct Mail brief with and without an email/phone and confirm the contact-info chip
flips; type a blog note with and without a URL and confirm the CTA chip flips; confirm the quality
meter moves Sparse → Optimal → Rich as text grows.
