# ADHD Ambient Audio + Dopamine Reset — Design

Date: 2026-08-17

## Purpose

Add two more executive-function tools to the ADHD Task Checklist
(`/admin/tasks`):

1. **Ambient Focus Audio** — Brown Noise / Binaural Beats / Lo-Fi Pad
   playback inside `FocusModeOverlay`, persists across task navigation.
2. **Dopamine Reset Drawer** — a "5-Min Reset" button offering 5 random
   non-screen micro-breaks with a countdown timer.

## 1. Ambient Focus Audio

### Audio source: synthesized, not files

No royalty-free audio assets exist in this repo, and none will be
fetched/guessed from external URLs. All three tracks are generated live via
the Web Audio API — no new dependency, no licensing risk:

- **Brown Noise**: a short (~2s) precomputed brown-noise `AudioBuffer`
  (random-walk integration, normalized), played through an
  `AudioBufferSourceNode` with `loop = true`.
- **Binaural Beats**: two `OscillatorNode`s (200Hz / 210Hz — 10Hz beat),
  each routed through a `StereoPannerNode` panned hard left / hard right.
- **Lo-Fi Pad**: 3 detuned `OscillatorNode`s (soft triangle wave, a minor
  chord) through a `BiquadFilterNode` (lowpass, ~800Hz) for warmth. This is
  an ambient pad approximation, not real lo-fi hip-hop with drums/vinyl
  crackle — UI labels it "Lo-Fi Pad" to set that expectation.

All three run through one master `GainNode` for the volume slider. Only one
track plays at a time; selecting a different track tears down the current
graph and builds the new one.

### Component: `AmbientAudioPlayer.tsx`

- New file, `src/components/admin/AmbientAudioPlayer.tsx`.
- Owns its own `AudioContext` (created lazily on first play — browsers block
  autoplay without a user gesture).
- Props: none needed beyond internal state; it's self-contained.
- UI: 3 toggle buttons (Brown Noise / Binaural Beats / Lo-Fi Pad), a
  play/pause button, a volume `<input type="range">`.
- Cleanup: `useEffect` unmount handler stops all active nodes and closes the
  `AudioContext`.

### Placement inside `FocusModeOverlay.tsx`

Mounted **outside** the `<motion.div key={task.id} ...>` block
(`FocusModeOverlay.tsx:175-267`) — that div remounts on every Prev/Next
task switch, which would kill and restart the `AudioContext` each time.
Placed as a sibling between the "Task X of Y" label (line 171-173) and that
motion.div, so it survives task navigation for the life of the Focus Mode
session and unmounts only when the whole overlay closes.

## 2. Dopamine Reset Drawer

### Component: `DopamineResetDrawer.tsx`

- New file, `src/components/admin/DopamineResetDrawer.tsx`.
- Fixed-overlay modal, same visual pattern as `BrainDumpModal.tsx`
  (dark backdrop, centered card), `z-[210]` (above `FocusModeOverlay`'s
  `z-[200]`, in case a user opens Reset while Focus Mode also happens to be
  open — page header control, not gated on Focus Mode state).
- On mount: shuffles a static pool of ~10 non-screen micro-resets (Hydrate,
  5-second stretch, 20-20-20 eye rule, stand and shake out hands, 5 slow
  breaths, step to a window/outside, 10 jumping jacks, cold water on face,
  tidy one small thing, sit quietly a moment) and displays 5.
- 5-minute countdown (`mm:ss`, visual), auto-starts on open, auto-closes the
  drawer at `0:00`.
- "Back to Focus" button closes the drawer immediately at any point.
- No billing-timer coupling — reset is reachable anytime from the page
  header, not scoped to an active Focus session; leaving the timer running
  avoids adding pause/resume state this feature doesn't need.

### Trigger

New button in the existing header row on
`src/app/(admin)/admin/tasks/page.tsx`, alongside Top 3 Focus / Focus Mode /
Surprise Me. New state `resetOpen: boolean`.

## Error handling

- Ambient audio: if `AudioContext` construction/resume throws (blocked
  autoplay, unsupported browser), the play button just no-ops — no toast
  spam for a non-critical feature.
- Reset drawer: none needed, purely client-side with no network calls.

## Out of scope

- No persistence of chosen track/volume across sessions.
- No completion-tracking on individual reset suggestions (display-only).
- No billing-timer pause during reset.

## Testing

- `tsc --noEmit` clean.
- Manual: play each of the 3 tracks, confirm audio survives clicking
  Prev/Next inside Focus Mode, confirm it stops when the overlay closes.
  Open 5-Min Reset, confirm 5 suggestions + countdown, confirm auto-close at
  zero and manual close via "Back to Focus".
