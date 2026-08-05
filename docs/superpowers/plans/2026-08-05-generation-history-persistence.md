# Generation History & Local Storage Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent, per-organization `localStorage` generation history (last 10 items) to the Copy Studio, Ad Builder, and Video Lab Creative Sandbox panels, with a shared slide-over drawer to view, restore, and clear it.

**Architecture:** A pure storage helper (`src/lib/sandboxHistory.ts`) wraps `localStorage` reads/writes behind try/catch, namespaced by `sandbox-history:${panelKey}:${scopeId}`. A thin React hook (`src/hooks/useSandboxHistory.ts`) re-syncs state from that helper whenever the panel or scope changes. A single `HistoryDrawer` component (visually modeled on the existing `BrandDnaDrawer.tsx`) is reused by all three panels. Each panel calls `add()` once per successful generation and wires a `restore()` callback that sets all its own state fields from a stored snapshot.

**Tech Stack:** Next.js (App Router), React, TypeScript, `framer-motion` (already a dependency, used by `BrandDnaDrawer.tsx`), `lucide-react` icons, `localStorage` — no new dependencies.

## Global Constraints

- Max 10 items per panel+scope history list (spec: "Store up to the last 10 generated items per panel").
- Storage key format: `sandbox-history:${panelKey}:${scopeId}` where `panelKey` is `'copy'` / `'ad'` / `'video'` and `scopeId` is the selected `organizationId` or the literal string `'none'`.
- All `localStorage` reads and writes must be wrapped in `try/catch` — malformed JSON or quota errors must never throw, crash a panel, or block a generation.
- History is recorded only on successful generation (never from a `catch` block).
- Restoring a history item happens immediately, no confirmation dialog.
- No new npm dependencies.
- `npx tsc --noEmit` must be clean (zero errors) before this work is considered done.

---

## Task 1: Storage Helper (`src/lib/sandboxHistory.ts`)

**Files:**
- Create: `src/lib/sandboxHistory.ts`
- Verification (temporary, deleted after use): `scratch-test-sandbox-history.ts` (repo root)

**Interfaces:**
- Produces: `SandboxHistoryItem<T>` type (`{ id: string; createdAt: string; summary: string; state: T }`), `loadHistory<T>(panelKey: string, scopeId: string): SandboxHistoryItem<T>[]`, `addHistoryItem<T>(panelKey: string, scopeId: string, summary: string, state: T): SandboxHistoryItem<T>[]`, `clearHistory(panelKey: string, scopeId: string): void`.

- [ ] **Step 1: Write `src/lib/sandboxHistory.ts`**

```ts
export type SandboxHistoryItem<T> = {
  id: string;
  createdAt: string; // ISO timestamp
  summary: string;
  state: T;
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

- [ ] **Step 2: Write a standalone verification script at repo root**

Node has no `localStorage` global, so the script stubs an in-memory one before importing the helper — this exercises the real cap/parse/quota-catch logic, not a mock of it.

```ts
// scratch-test-sandbox-history.ts
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
(globalThis as any).crypto = { randomUUID: () => Math.random().toString(36).slice(2) };

import { loadHistory, addHistoryItem, clearHistory } from './src/lib/sandboxHistory';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('PASS:', msg);
  }
}

// 1. Empty history for a fresh scope.
assert(loadHistory('copy', 'org1').length === 0, 'fresh scope starts empty');

// 2. Adding caps at 10, newest first.
let items = [];
for (let i = 0; i < 12; i++) {
  items = addHistoryItem('copy', 'org1', `item-${i}`, { i });
}
assert(items.length === 10, 'list caps at 10 items');
assert(items[0].summary === 'item-11', 'newest item is first');
assert(items[9].summary === 'item-2', 'oldest surviving item is item-2 (0 and 1 evicted)');

// 3. Scoping: a different scopeId has its own independent list.
assert(loadHistory('copy', 'org2').length === 0, 'a different scopeId has no history yet');
assert(loadHistory('copy', 'org1').length === 10, 'org1 history unaffected by checking org2');

// 4. Malformed JSON in storage is treated as empty, not thrown.
store.set('sandbox-history:ad:none', 'not json{{{');
assert(loadHistory('ad', 'none').length === 0, 'malformed JSON resolves to empty list, no throw');

// 5. clearHistory empties only the targeted scope.
clearHistory('copy', 'org1');
assert(loadHistory('copy', 'org1').length === 0, 'clearHistory empties the targeted scope');

// 6. setItem throwing (quota exceeded) is swallowed, still returns the computed list.
const realSetItem = (globalThis as any).localStorage.setItem;
(globalThis as any).localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
const resultDespiteQuotaError = addHistoryItem('video', 'none', 'quota-test', { x: 1 });
assert(resultDespiteQuotaError.length === 1, 'addHistoryItem returns computed list even if the write throws');
(globalThis as any).localStorage.setItem = realSetItem;

if (process.exitCode === 1) {
  console.error('One or more checks failed.');
} else {
  console.log('All sandboxHistory checks passed.');
}
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scratch-test-sandbox-history.ts`
Expected: every line prints `PASS:` and the final line is `All sandboxHistory checks passed.` with exit code 0.

- [ ] **Step 4: Delete the verification script**

```bash
rm scratch-test-sandbox-history.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/sandboxHistory.ts
git commit -m "feat: add sandboxHistory localStorage helper for generation history"
```

---

## Task 2: React Hook (`src/hooks/useSandboxHistory.ts`)

**Files:**
- Create: `src/hooks/useSandboxHistory.ts`

**Interfaces:**
- Consumes: `loadHistory`, `addHistoryItem`, `clearHistory`, `SandboxHistoryItem<T>` from `src/lib/sandboxHistory.ts` (Task 1).
- Produces: `useSandboxHistory<T>(panelKey: string, scopeId: string | null): { items: SandboxHistoryItem<T>[]; add: (summary: string, state: T) => void; clear: () => void }`.

- [ ] **Step 1: Write `src/hooks/useSandboxHistory.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { loadHistory, addHistoryItem, clearHistory, type SandboxHistoryItem } from '@/lib/sandboxHistory';

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

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing repo errors, if any, are unrelated to this task).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSandboxHistory.ts
git commit -m "feat: add useSandboxHistory hook"
```

---

## Task 3: Shared `HistoryDrawer` Component

**Files:**
- Create: `src/components/sandbox/HistoryDrawer.tsx`
- Reference (read-only, for styling pattern): `src/components/sandbox/BrandDnaDrawer.tsx`

**Interfaces:**
- Consumes: `SandboxHistoryItem<T>` from `src/lib/sandboxHistory.ts` (Task 1).
- Produces: `<HistoryDrawer<T> isOpen onClose items onRestore onClear />` React component, default export.

- [ ] **Step 1: Write `src/components/sandbox/HistoryDrawer.tsx`**

```tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trash2 } from 'lucide-react';
import type { SandboxHistoryItem } from '@/lib/sandboxHistory';

interface HistoryDrawerProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: SandboxHistoryItem<T>[];
  onRestore: (state: T) => void;
  onClear: () => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryDrawer<T>({ isOpen, onClose, items, onRestore, onClear }: HistoryDrawerProps<T>) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 dark:bg-[#080E1A] dark:border-white/10 z-[150] p-6 shadow-2xl font-mono text-xs flex flex-col overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">History</h3>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 space-y-2">
              {items.length === 0 ? (
                <p className="text-slate-500 dark:text-gray-400 text-[11px] font-sans text-center py-8">
                  No generations yet — your last 10 will show up here.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onRestore(item.state);
                      onClose();
                    }}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950/50 dark:hover:bg-slate-900 dark:border-slate-800/80 rounded-xl p-3 transition-colors"
                  >
                    <p className="text-slate-900 dark:text-white font-sans text-xs line-clamp-2">{item.summary}</p>
                    <p className="text-slate-500 dark:text-gray-500 text-[10px] mt-1">{timeAgo(item.createdAt)}</p>
                  </button>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                <button
                  onClick={onClear}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sandbox/HistoryDrawer.tsx
git commit -m "feat: add shared HistoryDrawer component"
```

---

## Task 4: Wire Up Copy Studio Panel

**Files:**
- Modify: `src/components/sandbox/CopyStudioPanel.tsx`

**Interfaces:**
- Consumes: `useSandboxHistory` (Task 2), `HistoryDrawer` (Task 3).

- [ ] **Step 1: Add imports and a snapshot type**

In `src/components/sandbox/CopyStudioPanel.tsx`, add to the top imports (after the existing `fetchJsonArray, fetchGenerationJson` import on line 11):

```ts
import { History as HistoryIcon } from 'lucide-react';
import { useSandboxHistory } from '@/hooks/useSandboxHistory';
import HistoryDrawer from './HistoryDrawer';
```

Add `History as HistoryIcon` into the existing `lucide-react` import on line 5 instead of a separate import line — i.e. change:
```ts
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket, RefreshCw } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, Sparkles, Pencil, Grid3x3, MapPinned, Rocket, RefreshCw, History as HistoryIcon } from 'lucide-react';
```

Below the existing `GenerationFailedNotice` function (after line 31), add the snapshot type:

```ts
type CopyStudioSnapshot = {
  mode: CopyStudioMode;
  prompt: string;
  tone: Tone;
  locations: string;
  audienceSegments: string;
  draft: GeneratedDraft | null;
  angleDrafts: AngleDraft[];
  dcoVariants: DcoVariant[];
};
```

- [ ] **Step 2: Add the hook and drawer-open state**

After the existing state declarations (after line 54, `const [stagingDco, setStagingDco] = useState(false);`), add:

```ts
const [historyOpen, setHistoryOpen] = useState(false);
const history = useSandboxHistory<CopyStudioSnapshot>('copy', organizationId);
```

- [ ] **Step 3: Record history on successful generation**

In the `generate` function, the DCO branch currently ends with (around line 104-105):
```ts
        setDcoVariants(data.variants);
        return;
```
Change to:
```ts
        setDcoVariants(data.variants);
        history.add(`[DCO] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: null, angleDrafts: [], dcoVariants: data.variants,
        });
        return;
```

The non-DCO branch currently ends with (around lines 119-123):
```ts
      if (mode === 'matrix') {
        setAngleDrafts(data.angles);
      } else {
        setDraft({ title: data.title, content: data.content });
      }
```
Change to:
```ts
      if (mode === 'matrix') {
        setAngleDrafts(data.angles);
        history.add(`[Matrix] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: null, angleDrafts: data.angles, dcoVariants: [],
        });
      } else {
        const singleDraft = { title: data.title, content: data.content };
        setDraft(singleDraft);
        history.add(`[Single] ${prompt.slice(0, 60)}`, {
          mode, prompt, tone, locations, audienceSegments,
          draft: singleDraft, angleDrafts: [], dcoVariants: [],
        });
      }
```

- [ ] **Step 4: Add a restore handler**

After the `generate` function's closing brace (before `const saveAsset = async ...`), add:

```ts
const restoreFromHistory = (snapshot: CopyStudioSnapshot) => {
  setMode(snapshot.mode);
  setPrompt(snapshot.prompt);
  setTone(snapshot.tone);
  setLocations(snapshot.locations);
  setAudienceSegments(snapshot.audienceSegments);
  setDraft(snapshot.draft);
  setAngleDrafts(snapshot.angleDrafts);
  setDcoVariants(snapshot.dcoVariants);
};
```

- [ ] **Step 5: Add the History button to the panel header**

Change the header line (line 200):
```tsx
<h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Copy Studio Controls</h2>
```
to:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Copy Studio Controls</h2>
  <button
    onClick={() => setHistoryOpen(true)}
    className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
    title="Generation history"
  >
    <HistoryIcon className="w-4 h-4" />
    {history.items.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
        {history.items.length}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 6: Render the drawer**

Just before the component's closing `</div>` (the final line before `);` at line 476), add:

```tsx
<HistoryDrawer
  isOpen={historyOpen}
  onClose={() => setHistoryOpen(false)}
  items={history.items}
  onRestore={restoreFromHistory}
  onClear={history.clear}
/>
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/sandbox/CopyStudioPanel.tsx
git commit -m "feat: wire generation history into Copy Studio panel"
```

---

## Task 5: Wire Up Ad Builder Panel

**Files:**
- Modify: `src/components/sandbox/AdBuilderPanel.tsx`

**Interfaces:**
- Consumes: `useSandboxHistory` (Task 2), `HistoryDrawer` (Task 3).

- [ ] **Step 1: Add imports and a snapshot type**

Change the import on line 5:
```ts
import { Wand2, Save, Loader2, ImageUp, RefreshCw } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, ImageUp, RefreshCw, History as HistoryIcon } from 'lucide-react';
```

Add after the existing `fetchJsonArray, fetchGenerationJson` import (line 9):
```ts
import { useSandboxHistory } from '@/hooks/useSandboxHistory';
import HistoryDrawer from './HistoryDrawer';
```

After the `AdDraft` type (line 18), add:
```ts
type AdBuilderSnapshot = {
  prompt: string;
  tone: Tone;
  platform: Platform;
  imageUrl: string;
  aspectRatio: AspectRatioId;
  draft: AdDraft | null;
};
```

- [ ] **Step 2: Add the hook and drawer-open state**

After the existing state declarations (after line 35, `const [dragOver, setDragOver] = useState(false);`), add:
```ts
const [historyOpen, setHistoryOpen] = useState(false);
const history = useSandboxHistory<AdBuilderSnapshot>('ad', organizationId);
```

- [ ] **Step 3: Record history on successful generation**

Change (lines 63-64):
```ts
      });
      setDraft({ title: data.title, content: data.content, metadata: data.metadata });
```
to:
```ts
      });
      const newDraft = { title: data.title, content: data.content, metadata: data.metadata };
      setDraft(newDraft);
      history.add(`[${platform}] ${prompt.slice(0, 60)}`, { prompt, tone, platform, imageUrl, aspectRatio, draft: newDraft });
```

- [ ] **Step 4: Add a restore handler**

After the `generate` function's closing brace (before `const saveToStaged = async ...`), add:
```ts
const restoreFromHistory = (snapshot: AdBuilderSnapshot) => {
  setPrompt(snapshot.prompt);
  setTone(snapshot.tone);
  setPlatform(snapshot.platform);
  setImageUrl(snapshot.imageUrl);
  setAspectRatio(snapshot.aspectRatio);
  setDraft(snapshot.draft);
};
```

- [ ] **Step 5: Add the History button to the panel header**

Change (line 101):
```tsx
<h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Builder Controls</h2>
```
to:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Ad Builder Controls</h2>
  <button
    onClick={() => setHistoryOpen(true)}
    className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
    title="Generation history"
  >
    <HistoryIcon className="w-4 h-4" />
    {history.items.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
        {history.items.length}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 6: Render the drawer**

Just before the component's closing `</div>` (the final line before `);` at line 259), add:
```tsx
<HistoryDrawer
  isOpen={historyOpen}
  onClose={() => setHistoryOpen(false)}
  items={history.items}
  onRestore={restoreFromHistory}
  onClear={history.clear}
/>
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/sandbox/AdBuilderPanel.tsx
git commit -m "feat: wire generation history into Ad Builder panel"
```

---

## Task 6: Wire Up Video Lab Panel

**Files:**
- Modify: `src/components/sandbox/VideoLabPanel.tsx`

**Interfaces:**
- Consumes: `useSandboxHistory` (Task 2), `HistoryDrawer` (Task 3).

- [ ] **Step 1: Add imports and a snapshot type**

Change (line 5):
```ts
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic, RefreshCw } from 'lucide-react';
```
to:
```ts
import { Wand2, Save, Loader2, Clapperboard, Copy, Download, Mic, RefreshCw, History as HistoryIcon } from 'lucide-react';
```

Change (line 9):
```ts
import { fetchGenerationJson } from '@/lib/sandboxClientFetch';
```
to:
```ts
import { fetchGenerationJson } from '@/lib/sandboxClientFetch';
import { useSandboxHistory } from '@/hooks/useSandboxHistory';
import HistoryDrawer from './HistoryDrawer';
```

After the `VideoDraft` type (line 15), add:
```ts
type VideoLabSnapshot = {
  prompt: string;
  tone: Tone;
  lengthSeconds: number;
  draft: VideoDraft | null;
};
```

- [ ] **Step 2: Add the hook and drawer-open state**

After the existing state declarations (after line 51, `const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({});`), add:
```ts
const [historyOpen, setHistoryOpen] = useState(false);
const history = useSandboxHistory<VideoLabSnapshot>('video', null);
```

Video Lab has no org selector, so `scopeId` is always `null` — the hook resolves this to the `'none'` scope internally.

- [ ] **Step 3: Record history on successful generation**

Change (line 67):
```ts
      setDraft({ title: data.title, content: data.content, metadata: { beats } });
```
to:
```ts
      const newDraft = { title: data.title, content: data.content, metadata: { beats } };
      setDraft(newDraft);
      history.add(`${lengthSeconds}s — ${prompt.slice(0, 60)}`, { prompt, tone, lengthSeconds, draft: newDraft });
```

Note: per-beat audio generated later via `generateBeatAudio` updates `draft` in place through `updateBeat`/`setDraft` but does not call `history.add` again — only the initial storyboard generation is recorded, matching the spec's "only successful generations enter history" rule (voiceover generation is explicitly out of scope per the sibling retry spec too).

- [ ] **Step 4: Add a restore handler**

After the `generate` function's closing brace (before `const updateBeat = ...`), add:
```ts
const restoreFromHistory = (snapshot: VideoLabSnapshot) => {
  setPrompt(snapshot.prompt);
  setTone(snapshot.tone);
  setLengthSeconds(snapshot.lengthSeconds);
  setDraft(snapshot.draft);
};
```

- [ ] **Step 5: Add the History button to the panel header**

Change (line 167):
```tsx
<h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Video Lab Controls</h2>
```
to:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Video Lab Controls</h2>
  <button
    onClick={() => setHistoryOpen(true)}
    className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
    title="Generation history"
  >
    <HistoryIcon className="w-4 h-4" />
    {history.items.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
        {history.items.length}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 6: Render the drawer**

Just before the component's closing `</div>` (the final line before `);` at line 398), add:
```tsx
<HistoryDrawer
  isOpen={historyOpen}
  onClose={() => setHistoryOpen(false)}
  items={history.items}
  onRestore={restoreFromHistory}
  onClear={history.clear}
/>
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/sandbox/VideoLabPanel.tsx
git commit -m "feat: wire generation history into Video Lab panel"
```

---

## Task 7: Final Verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (leave running)

- [ ] **Step 3: Manual browser check — Copy Studio**

Navigate to `/sandbox`, open Copy Studio:
1. Generate in Single mode. Confirm the History badge shows `1`.
2. Switch to Matrix mode, generate. Confirm the badge shows `2`.
3. Open the History drawer. Confirm both entries show, newest first, each tagged `[Single]` / `[Matrix]`, with a relative timestamp.
4. Click the `[Single]` entry. Confirm the panel switches back to Single mode and shows the original draft content.
5. Reload the page. Confirm the History drawer still shows both entries (proves `localStorage` persistence).
6. Select a client org from the dropdown that has no history yet. Confirm the badge disappears / drawer shows the empty state. Switch back to "No client selected" — confirm the original 2 entries reappear.
7. Click "Clear History". Confirm the list empties and the badge disappears.

- [ ] **Step 4: Manual browser check — Ad Builder**

1. Generate an ad. Confirm the History badge shows `1`.
2. Open the drawer, confirm the entry shows `[Meta]` (or whichever platform was selected) and the prompt.
3. Change the prompt and platform, generate again. Confirm badge shows `2`.
4. Click the first history entry. Confirm prompt, tone, platform, image URL, aspect ratio, and draft all revert to that entry's values.
5. Reload the page. Confirm history persists.
6. Clear history, confirm it empties.

- [ ] **Step 5: Manual browser check — Video Lab**

1. Generate a storyboard. Confirm the History badge shows `1`.
2. Change the brief/length, generate again. Confirm badge shows `2`.
3. Click the first history entry. Confirm the storyboard, prompt, tone, and length all revert.
4. Reload the page. Confirm history persists.
5. Clear history, confirm it empties.

- [ ] **Step 6: Confirm no regressions**

Confirm each panel's existing Retry-on-failure UI (from the prior retry/backoff sub-project) still works — trigger a failed generation (e.g. via browser devtools network throttling/blocking `/api/sandbox/generate`) and confirm the inline Retry button still appears and still works, unaffected by this change.
