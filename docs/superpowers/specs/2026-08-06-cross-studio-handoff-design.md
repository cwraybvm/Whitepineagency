# Cross-Studio Handoff ("Send to Tool") — Design

## Context

Second sub-project of the "Creative Sandbox UX & Robustness Enhancements" roadmap. Lets users push
a completed draft's content from one Creative Sandbox panel into another, pre-filled.

## Existing mechanism (reused, not rebuilt)

`(sandbox)/sandbox/page.tsx` already owns `pendingInsert: { tool: SandboxTool; text: string } | null`
plus `onInsertConsumed`. `BrandIdentityPanel` and `ComplianceAuditPanel` already call
`onInsertPhrase(tool, text)` to stash a payload and switch tabs; `CopyStudioPanel`, `AdBuilderPanel`,
`VideoLabPanel`, and `CampaignBatchPanel` already consume it (seed a `useState` initializer from
`pendingInsert`, then `useEffect` once on mount to call `onInsertConsumed`).

Every target panel's primary input is a single free-text field — `briefText`, `prompt`, or `text`.
So every requested handoff direction reduces to: compose one text blob from the source panel's
current draft, hand it to the existing mechanism, land it in the target's existing text field.

## New receivers

`DirectMailPanel` and `BlogPostStudioPanel` gain `pendingInsert`/`onInsertConsumed` props, wired
identically to `CopyStudioPanel`:
- `DirectMailPanel`: `briefText` initial state reads from `pendingInsert.text` when
  `pendingInsert?.tool === 'direct-mail'`.
- `BlogPostStudioPanel`: `text` initial state reads the same way when
  `pendingInsert?.tool === 'blog-post'` (mode stays `'notes'`, already the default).

`AdBuilderPanel` already receives — no change needed there.

## New senders

Each button is guarded on `pkg !== null` — nothing to send before a draft exists.

**`DirectMailPanel` header — "Send to Blog Studio"** (`onInsertPhrase('blog-post', text)`):
```
${briefText}

Headline: ${activeVariant.headline}
Key message: ${activeVariant.bodyCopy}
Call to action: ${activeVariant.callToAction}
Contact: ${activeVariant.pointOfContact.name} — ${activeVariant.pointOfContact.email} — ${activeVariant.pointOfContact.phone}
```

**`MasterCampaignPanel` header — "Send to Blog Studio"** (`onInsertPhrase('blog-post', text)`):
```
${promoOffer}

Location: ${location}

${pkg.googleBusinessPosts[0]?.content || ''}
```
No point-of-contact field exists on this panel's data — not fabricated.

**`BlogPostStudioPanel` header — "Convert to Direct Mail"** (`onInsertPhrase('direct-mail', text)`):
```
${pkg.title}

${pkg.excerpt}

Call to action: ${pkg.callToAction}
```
No audience field exists on `BlogPostPackage` — "target audience" extraction skipped, not
fabricated; `DirectMailPanel`'s `audiences` array is left untouched.

**`BlogPostStudioPanel` header — "Generate Ad Set"** (`onInsertPhrase('ad', text)`):
```
${pkg.title} — ${pkg.excerpt}

Hooks: ${pkg.targetKeywords.join(', ')}

CTA: ${pkg.callToAction}
```

## page.tsx change

The repeated inline closure
`(tool, text) => { setPendingInsert({ tool, text }); setActiveTool(tool); }` — currently duplicated
for `BrandIdentityPanel` and `ComplianceAuditPanel` — becomes one named `handleInsertPhrase`
function, passed as `onInsertPhrase` to those two plus the three new sender panels (5 call sites
justifies the extraction).

## Out of scope / skipped

- A generic dropdown "action menu" component. Every source panel has only 1-2 destinations; a
  dropdown for a single option is a menu around nothing. Revisit if a panel gets a 3rd destination.
- Any new *sending* capability on `AdBuilderPanel` or `VideoLabPanel` — not requested, no clear
  target in the roadmap.
- Fabricating fields that don't exist on the source data (point-of-contact from Master Campaign,
  target audience from a blog post).

## Testing

`npx tsc --noEmit` clean. Live browser check: generate a Direct Mail package, click "Send to Blog
Studio", confirm the tab switches and the Blog Studio notes field is pre-filled; repeat for Master
Campaign → Blog, Blog → Direct Mail, Blog → Ad Builder (Ad Builder receiver already existed —
confirm it still works via this new sender).
