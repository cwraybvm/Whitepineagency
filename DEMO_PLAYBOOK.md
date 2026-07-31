# White Pine Sales Demo Playbook

Live-pitch reference for demoing the White Pine platform to a local-service
business prospect (HVAC, plumbing, electrical, roofing, etc.). Everything
here runs off the real app — no slides, no video. You're driving `/hub`
live in front of the prospect.

**Before you start:** log in at `/login` (admin credentials). Every
protected module — Admin, CRM, Fulfillment — needs an active session. The
Demo Portal (`/demo/simulator`, `/demo/audit-generator`) and the public
audit page (`/audit/[slug]`) are open, no login needed, if you ever want to
hand the screen to the prospect directly.

---

## 5-Minute Pitch Script

Timed for a first call or a booth walk-up. Cut to 2 minutes by doing only
Beat 2 and 3 if you're short on time — they're the ones that close.

### Beat 1 — Open on the Launchpad (30s)

Land on `/hub`. Don't explain it, just let it sit on screen for a second —
the dark console look does the talking.

> "This is the operator view. Everything we run for clients lives in one
> place. I want to show you two things: what your website is actually
> costing you right now, and what happens the next time someone calls you
> after hours and you don't pick up."

### Beat 2 — Prospect Audit Generator (90s)

Press **4** for the Demo Portal, then click the **Audit Generator** tab at
the top (or open `/demo/audit-generator` directly — see
[Hotkey Workflow](#hotkey-workflow) below).

1. Type the prospect's real business name and website URL. Use their
   actual site — this is the moment that lands, because the numbers are
   real, not a mockup.
2. Optionally set their target keyword ("emergency plumber near me") and
   average job value if you know it.
3. Click **Generate Audit**. Narrate while it loads (~2-20s, it's hitting
   live Google PageSpeed data):

> "This is pulling your actual site speed and where you rank locally for
> that search — live, right now."

4. Land on the score card. Walk it in this order:
   - **Site Speed** — "This is your mobile load time. Google derank slow
     sites, and slow sites lose mobile visitors before the page even
     paints."
   - **Local Search Rank** — point at their rank and the two competitors
     shown above them. "These two are eating calls that should be yours."
   - **Missed Revenue** — this is the number that matters. "Based on your
     rank right now, we estimate you're losing about $X and Y missed
     calls a month — every month, whether you fix it or not."
5. Click **Add to CRM Pipeline**. "That's it — you're already in our
   system as a New Lead. That's how fast this moves once you say go."

### Beat 3 — Missed Call Text-Back Simulator (90s)

Navigate to `/demo/simulator` (hotkey **4** from `/hub`, or the tab strip
at the top of the audit generator page).

1. Pick a caller persona and a missed-call reason (No Answer / Busy /
   After Hours — pick whichever matches their real situation, e.g. "After
   Hours" if they close at 5pm).
2. Click **Trigger Missed Call**. Let the phone mockup on the right play
   out — ringing, then the auto text-back appears in under 2 seconds.

> "That text just went out automatically. No one touched a phone. This
> happens the second a call goes to voicemail, 24/7, including tonight
> after you close."

3. Click **Simulate Customer Reply** to show the two-way thread landing.
   "Now you've got a live conversation instead of a missed call — which
   usually would've just gone to your competitor."

### Beat 4 — Shadow Portal (60s)

Navigate to `/admin/shadow/1` (or whichever client ID matches the demo
account you've got seeded — see [Hotkey Workflow](#hotkey-workflow)).

> "This is exactly what you'd see logging in — your leads, your Google
> rating, your retainer status. Nothing hidden, no separate 'client'
> version that's watered down. This is the real dashboard."

Point out the amber **ADMIN SHADOW MODE** banner — reassure them this is
just how you (the agency) can jump into any client's view for support;
their own login never shows this banner.

### Beat 5 — Close on the CRM Pipeline (60s)

Navigate to `/crm` (hotkey **2** from `/hub`). Find the lead you just
created in Beat 2 sitting in **New Leads**.

> "This is where you'd already be sitting in our pipeline. Next step from
> here is a quick call to scope the retainer, and once we're set up, this
> whole board — plus everything I just showed you — is live for your
> business."

Drag their card to **Contacted** while you say it. Ends the pitch on a
concrete next action, not a slide.

---

## Hotkey Workflow

From `/hub`, press **1–5** to jump straight into any module — no clicking
through nav. Use this table to know what's a hotkey away and what's one
extra click past that.

| Key | Module | Route | In the pitch |
|-----|--------|-------|---------------|
| **1** | Admin Operations | `/admin` | Not part of the core pitch — internal ops console (pipeline, quoting, telemetry). Skip unless the prospect asks how *you* run things. |
| **2** | CRM & Pipeline | `/crm` | Beat 5 — where the lead lands after the audit. |
| **3** | Fulfillment Center | `/fulfillment` | Not part of the core pitch — show only if asked "what happens after I sign up" (onboarding checklist + SLA board). |
| **4** | Demo & Sales Portal | `/demo/simulator` | Beat 3. Landing here also gives you the tab strip at the top — click **Audit Generator** to reach Beat 2 without going back through `/hub`. |
| **5** | Client Portal Experience | `/portal/dashboard` | Not part of the core pitch — the generic (non-shadow) client dashboard, useful if they ask what a *different* client's login looks like. |

**Not a hub hotkey — one click deeper:**

- **Prospect Audit Generator** (`/demo/audit-generator`) — reach it via
  hotkey **4**, then the tab strip at the top of `/demo/simulator`, or
  bookmark it directly for a faster Beat 2.
- **Shadow Portal** (`/admin/shadow/[clientId]`) — no in-app link to it
  yet, so type or bookmark the URL directly. `/admin/shadow/1` is a good
  fixed demo link (maps to the seeded Apex Mechanical Services account).

If you're doing the full 5-minute script back to back, skip `/hub` after
the opening beat and just navigate directly — it's faster than re-pressing
hotkeys from the launchpad every time.

---

## Objection Battlecard Cheat Sheet

Same six responses as the slide-over drawer on `/demo/simulator` (click
**Battlecards** in the top-right to pull it up live mid-call). Use this
table as your own cheat sheet before the reference matters — glance at the
trigger phrase, not the whole paragraph.

| Trigger | Category | One-line answer |
|---|---|---|
| "This seems expensive" | `PRICING` | One missed job (usually $300–$1,500) pays for the whole thing. Everything after that's upside. |
| "We already have an answering service" | `COMPETITION` | Answering services still make callers wait. We text back in under 15 seconds, automatically — works alongside what they have, not instead of it. |
| "How fast does it set up?" | `TIMELINE` | Same day for most accounts, live in 24–48 hours. No hardware, no carrier contract. |
| "Will my customers know it's AI?" | `TRUST` | Reads like a normal text from the business. They can review/tweak the copy before it goes live. |
| "Will this work for my industry?" | `FIT` | Works for anyone losing jobs to voicemail or slow follow-up — HVAC, plumbing, electrical, roofing, legal intake, med spas. Copy gets customized to their trade. |
| "Are we locked into a contract?" | `CONTRACT` | Month-to-month, cancel anytime, no fee. |

If a live objection doesn't match one of these six, don't improvise a
guess on pricing or contract terms — note it and follow up after the call.
