# Admin / Ops Surface Overrides

> **Scope:** `src/app/admin/**`, `src/app/dashboard/**`
> ⚠️ Rules here override `MASTER.md`. Where no rule is listed, MASTER applies as-is —
> this surface uses MASTER's palette/typography directly (no color/font override).

**Page Type:** Dashboard / Data View
**Routes:** `admin/analytics`, `admin/quote`, `admin/reports`, `dashboard`

---

## Density

**Dial:** 8/10 (Dense / Dashboard)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` | Table cell gaps |
| `--space-sm` | `4px` | Icon gaps, inline spacing |
| `--space-md` | `8px` | Standard padding |
| `--space-lg` | `16px` | Card/section padding |
| `--space-xl` | `24px` | Section margins |

- Max width: full-width, 12-column grid.
- KPI cards (`ClientKpi`, `Metric`): minimal padding, numeric values in Fira Code.

## Kanban Board (`TaskColumn` / `TaskCard`, `@hello-pangea/dnd`)

- Drag handle: `cursor-grab`, `cursor-grabbing` while active.
- Drop zone: highlight border/background on `dragover`, clear on drop/leave.
- Card lift on drag: `transform` + `box-shadow` only — never animate width/height (layout thrash).
- Transition: 150-200ms ease, matches MASTER's transition timing.

## Charts (`recharts`) — Analytics, Reports, SEO tracking

- Every chart needs a legend + tooltip. Never encode meaning by color alone (colorblind-safe).
- Row highlighting on hover for data tables (`SeoKeyword`, `AuditRun`, `InboxMessage` lists).
- Loading state: skeleton or spinner, not blank — data-dense views should never flash empty.

## Mode

Light + dark both fully supported (ops tool, long sessions). Respect OS/user preference, no forced default.
