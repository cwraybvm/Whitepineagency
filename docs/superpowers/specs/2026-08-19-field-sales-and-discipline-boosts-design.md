# Field Sales & Client Intelligence + Discipline Boosts — Design

## Module 1: Field Sales & Client Intelligence

### Photo attachment
`BvmClientKanban` gets `photoUrl String? @db.Text`. No `@vercel/blob` token is configured in either env file (`BLOB_READ_WRITE_TOKEN` absent from `.env`/`.env.local`, confirmed by grep) — going with the spec's other named option, a base64 data URL stored directly on the record, rather than wiring blob storage against a token that can't be verified working in this environment. `src/lib/photoAttachment.ts` exports `readFileAsDataUrl(file)` (wraps `FileReader`) and a `MAX_PHOTO_BYTES` guard (2MB post-encoding) so a phone photo doesn't silently balloon the row — oversized files are rejected client-side with a toast, not uploaded.

"📸 Attach Photo" (`<input type="file" accept="image/*" capture="environment">`, so mobile opens the camera directly) appears in both the Client Kanban modal and each Drop-Off Route checklist row. Saving PATCHes `/api/bvm/clients` with `{ id, photoUrl }` — same endpoint both surfaces already use for everything else on the client record.

### Voice memo → transcribed note
Spec offers two options ("Web Speech API or server-side speech endpoint"); Web Speech API's `SpeechRecognition` needs no server, no new dependency, and no audio storage — it streams transcription directly, which is what the actual requirement (get text into `contactNotes`) needs. A `MediaRecorder`-based raw-audio recorder would additionally require a place to store the audio file (the same storage question the photo feature just resolved by not having blob storage available) for no requirement that asks for a replayable recording — the spec's own bullet list never asks to persist audio, only the transcribed text. Going with Speech Recognition only.

`src/hooks/useVoiceMemo.ts`: a `{ supported, recording, start, stop }` hook wrapping `webkitSpeechRecognition`/`SpeechRecognition` (guarded — Firefox/Safari don't have it; `supported` drives a disabled state + explanatory toast, same pattern as the existing geolocation-unavailable handling in Drop-Off Route). `start(onDone)` begins continuous, interim-enabled recognition, accumulates final results in a ref; `stop()` ends it and calls `onDone(transcript)`. Both pages call this the same way: on completion, prepend a `[Voice Memo: {timestamp}]` marker (via the new shared `src/lib/timestamp.ts#formatTimestamp`, extracted from the existing `mark-dropped-off` route so there's one date-format implementation instead of three) and append to the client's `contactNotes`, then PATCH.

### Cold Account (30+ days)
`src/lib/clientActivity.ts` exports `COLD_ACCOUNT_DAYS = 30` and `isColdAccount(lastContacted)`. "Last visited/contacted... across `BvmClientKanban` and `BvmCallLog`" — `BvmCallLog` has no per-client relation (it's an anonymous numbered call grid, not tied to individual clients; confirmed in schema), so there's no real second signal to join against there. The one genuine per-client signal is `BvmClientKanban.lastContacted` — but today only the modal's manual date field sets it; a completed drop-off never did. Fixing that: `mark-dropped-off` now also sets `lastContacted: now` (a drop-off *is* a contact event), which is what makes "last visited or contacted" true in practice rather than just in the field name.

Kanban cards: cold accounts get the new "⚠️ Cold Account (30+ Days)" badge in place of the existing 14-day "Stale" badge when both would apply (cold implies stale; showing both is redundant noise). Drop-Off Route: `GET /api/bvm/drop-off-route` adds `lastContacted` to each stop; the selector shows the same badge, plus a "Show Cold Accounts Only" toggle next to Select All/Clear All that filters the visible list.

## Module 2: Consistent Discipline Boosts

### Streaks
`src/lib/disciplineStreaks.ts`:
- `computeDailyStreak(logs, todayStr, meetsTarget)`: walks backward day-by-day from today while `meetsTarget` holds, stops at the first miss or missing day. Used for Reading (`pagesRead >= 10`) and Water (`waterGlasses >= 7`).
- `computeWeeklyStreak(logs, todayStr, countInWeek, meetsWeek)`: walks backward week-by-week (reusing `weekRange`'s Sunday-start convention), **starting from the most recently completed week** — the current in-progress week is excluded from streak scoring since it hasn't finished yet (its live progress is already shown by the existing "n/2 this week" chips; folding an unfinished week into a streak count would be ambiguous — does an incomplete 1/2 week break the streak, or is it still "pending"? Excluding it sidesteps the ambiguity entirely). Used for Jiu-Jitsu and Workout (`count >= 2`).

Both are bounded by how much history gets fetched — the page pulls a 180-day window (`~26 weeks`) once on mount for this purpose. *ponytail: a genuine streak longer than 180 days will undercount; widen the fetch window if that ever becomes real rather than paginating speculatively now.*

Rendered as four flame-badge counters: `🔥 {n}-Day Reading Streak`, `💧 {n}-Day Water Streak`, `🥋 {n}-Week Jiu-Jitsu Streak`, `💪 {n}-Week Workout Streak` — always shown (0 is a valid, honest state, not hidden).

### Daily Operational Discipline Score
Five components, each proportional-and-capped (not binary all-or-nothing) at 20% weight — matches the spec's own phrasing for the Calls and training components ("Calls / Daily Target," "Weekly pace credit"), and a proportional score is what makes it meaningfully "live" through the day rather than jumping from 0% to 20% at the exact instant a threshold is crossed:

```
score = 20·min(1, calls/CALL_DAILY_TARGET)
      + 20·min(1, pagesRead/10)
      + 20·min(1, waterGlasses/7)
      + 20·min(1, jiuJitsuWeekCount/2)
      + 20·min(1, workoutWeekCount/2)
```

`CALL_DAILY_TARGET` (45) and `LEADS_TARGET` (10) move from a locally-defined constant inside `call-consistency/page.tsx` into a new shared `src/lib/bvmTargets.ts` — this page needs the same call target Call Consistency already hardcodes, and importing one source beats defining a second copy that could silently drift from the first. `call-consistency/page.tsx` switches to importing it too; behavior is unchanged, just de-duplicated.

The score and streaks are anchored to **today**, always — independent of the page's existing date picker (which lets you view/edit *past* days' logs). A "Daily Score" that changed when you scrolled through history would be misleading; the spec's own wording ("today's target achievements") confirms this is meant to be live, not tied to whatever date happens to be selected below it. Fetched once on mount via a separate effect from the existing date-driven one.

Rendered as a hand-rolled SVG circular progress ring (stroke-dasharray trick — no charting library, this is a single ring, not a data-viz surface) as a hero element above the existing metric cards: `🎯 {score}% Daily Score`.

## Out of scope
- No audio file persistence for voice memos (see above — only the transcribed text is a stated requirement).
- No blob/CDN photo storage (no configured token in this environment; base64 data URL is the spec's own named fallback).
- No pagination/virtualization for the 180-day streak fetch — a single BVM operator's log table won't be large enough to matter.
