# Generation History & Local Storage Persistence — Design

## Context

This is the second of three sub-projects requested under a "Sandbox Robustness & Resilience Pass"
(the first — generation call retry/backoff — is already shipped, see
`docs/superpowers/specs/2026-08-04-generation-retry-backoff-design.md`; the third — a ZIP export
endpoint — is independent and out of scope here). This spec covers adding persistent local
generation history to three Creative Sandbox panels: Copy Studio, Ad Builder, and Video Lab.

## Scope Decisions

**Only 3 panels, not all 6 generation panels.** Copy Studio, Ad Builder, and Video Lab get history.
Landing Page Studio, Campaign Batch, and Swipe Analyzer are out of scope for this pass — they don't
have the same "iterate on one draft repeatedly" usage pattern that makes history valuable.

**Copy Studio's 3 sub-modes (single / 5-angle matrix / DCO) share one history list, mode-tagged.**
Each panel keeps a single "last 10" list. A history entry records which mode produced it; restoring
an entry switches the panel back into that mode as part of restoring state.

**History is scoped per organization, per panel.** Copy Studio and Ad Builder both have a client-org
selector; Video Lab doesn't. Storage key includes the selected org (or a sentinel for "no client
selected"), so switching the client dropdown swaps in that client's own history rather than mixing
drafts across clients.

**Restore is immediate, no confirmation prompt.** Clicking a history item replaces whatever's
currently on the canvas without a confirm dialog — consistent with how clicking "Generate" itself
already clears the prior draft with no warning.

**Drawer is a fixed slide-over from the right**, matching the existing `BrandDnaDrawer.tsx` visual
pattern (backdrop + `framer-motion` slide-in), rather than an inline collapsible section in the
380px-wide controls column.

## Architecture

### Storage helper — `src/lib/sandboxHistory.ts`

```ts
export type SandboxHistoryItem<T> = {
  id: string;
  createdAt: string; // ISO timestamp
  summary: string;   // short derived label, e.g. "[Matrix] $79 Spring AC Tune-Up promo…"
  state: T;          // panel-specific snapshot, see "Per-Panel State" below
};

const MAX_ITEMS = 10;

function storageKey(panelKey: string, scopeId: string): string {
  return `sandbox-history:${panelKey}:${scopeId}`;
}

export function loadHistory<T>(panelKey: string, scopeId: string): SandboxHistoryItem<T>[] {
  try {
    const raw = localStorage.getItem(storageKey(panelKey, scopeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistoryItem<T>(panelKey: string, scopeId: string, summary: string, state: T): SandboxHistoryItem<T>[] {
  const existing = loadHistory<T>(panelKey, scopeId);
  const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), summary, state }, ...existing].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(storageKey(panelKey, scopeId), JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — history is best-effort, drop silently.
  }
  return next;
}

export function clearHistory(panelKey: string, scopeId: string): void {
  try {
    localStorage.removeItem(storageKey(panelKey, scopeId));
  } catch {
    // ignore
  }
}
```

### Hook — `src/hooks/useSandboxHistory.ts`

```ts
export function useSandboxHistory<T>(panelKey: string, scopeId: string | null) {
  const effectiveScope = scopeId || 'none';
  const [items, setItems] = useState<SandboxHistoryItem<T>[]>([]);

  useEffect(() => {
    setItems(loadHistory<T>(panelKey, effectiveScope));
  }, [panelKey, effectiveScope]);

  const add = (summary: string, state: T) => {
    setItems(addHistoryItem<T>(panelKey, effectiveScope, summary, state));
  };

  const clear = () => {
    clearHistory(panelKey, effectiveScope);
    setItems([]);
  };

  return { items, add, clear };
}
```

One hook instance per panel, called with that panel's own `panelKey` (`'copy'`, `'ad'`, `'video'`)
and its current `organizationId` (or `null` for Video Lab, which has no org selector — resolves to
the `'none'` scope).

## Per-Panel State

Each panel's `generate()` calls `add(summary, state)` once, at the end of the success path in
`try` — never from `catch`, so only successful generations are recorded.

**Copy Studio** (`CopyStudioPanel.tsx`) — snapshot:
```ts
{ mode, prompt, tone, locations, audienceSegments, draft, angleDrafts, dcoVariants }
```
`summary` is built as `` `[${modeLabel}] ${prompt.slice(0, 60)}` `` where `modeLabel` is "Single" /
"Matrix" / "DCO". Restoring sets `mode` first, then every listed field — `organizationId` is left
untouched since the list is already scoped to the currently-selected org.

**Ad Builder** (`AdBuilderPanel.tsx`) — snapshot:
```ts
{ prompt, tone, platform, imageUrl, aspectRatio, draft }
```
`summary` is `` `[${platform}] ${prompt.slice(0, 60)}` ``.

**Video Lab** (`VideoLabPanel.tsx`) — snapshot:
```ts
{ prompt, tone, lengthSeconds, draft }
```
`draft.metadata.beats` (including any per-beat `audioUrl`/`voiceId` already generated) travels with
it since it's part of `draft`. `summary` is `` `${lengthSeconds}s — ${prompt.slice(0, 60)}` ``.

## UI

### `HistoryDrawer` component — `src/components/sandbox/HistoryDrawer.tsx`

Shared across all 3 panels, visually modeled on `BrandDnaDrawer.tsx` (backdrop + `framer-motion`
slide-over from the right, same header/close-button/font-mono styling).

```ts
interface HistoryDrawerProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: SandboxHistoryItem<T>[];
  onRestore: (state: T) => void;
  onClear: () => void;
}
```

Each row renders the `summary`, a relative timestamp ("12m ago" — small local helper, no new
dependency), and is a click target that calls `onRestore(item.state)` then `onClose()`. No per-row
delete — the single "Clear History" button at the bottom of the drawer calls `onClear()` for the
whole list. Empty state: "No generations yet — your last 10 will show up here."

### Panel header wiring

Each panel's controls-card header (currently just an `<h2>`) gains a `History` icon button
(`lucide-react`) to its right, showing an item-count badge when non-empty. Clicking it opens the
drawer. `onRestore` sets all the panel's own state fields from the snapshot in one shot (for Copy
Studio: `setMode`, `setPrompt`, `setTone`, `setLocations`, `setAudienceSegments`, `setDraft`,
`setAngleDrafts`, `setDcoVariants`).

## Safety & Resilience

- Malformed JSON in `localStorage` (corrupted or hand-edited) is caught in `loadHistory` and treated
  as an empty list — no crash, no toast, since this is a best-effort convenience cache rather than
  data the user explicitly saved.
- `setItem` quota errors (e.g. storage full or disabled in a private-browsing context) are caught in
  `addHistoryItem` and dropped silently — a failed history write must never block or error out a
  generation that otherwise succeeded.
- Org-scoping means clearing history for one client never touches another client's history, and
  history for a deleted/renamed org just becomes orphaned (harmless) local storage — no cleanup job
  needed for this pass. `ponytail: orphaned per-org keys never get garbage collected; add a prune
  pass if this becomes a real quota problem in practice.`

## Out of Scope

- Landing Page Studio, Campaign Batch, Swipe Analyzer history (different usage pattern — see Scope
  Decisions).
- Per-row delete within the drawer (only whole-list "Clear History").
- Cross-device or server-side history sync (this is `localStorage`-only, per-browser).
- Confirmation dialog before restore overwrites the current canvas.
- Pruning orphaned history for deleted/renamed organizations.

## Testing

`npx tsc --noEmit` clean, zero errors.

Live browser verification per panel (Copy Studio in each of its 3 modes, Ad Builder, Video Lab):
1. Generate — confirm the History badge count increments by 1.
2. Reload the page — confirm the history list still shows the item (proves `localStorage`
   persistence, not just in-memory state).
3. Click the history item — confirm the canvas restores exactly (prompt, tone, and all mode-specific
   fields/draft content match what was generated).
4. Click "Clear History" — confirm the list empties and the badge disappears.
5. For Copy Studio/Ad Builder: switch the client-org dropdown — confirm the history list changes to
   that org's own items (or is empty for an org with no history yet), proving scoping works.
