# Client Portal Surface Overrides

> **Scope:** `src/app/portal/**`, `src/app/estimate/**`, `src/app/reports/[id]/**`, `src/app/login/**`
> ⚠️ Rules here **override** `MASTER.md` — this surface uses a different palette,
> type, and style direction from the admin/ops surface. Client-facing, trust-first.

**Page Type:** Client Portal / Deliverable View
**Routes:** `portal`, `estimate`, `reports/[id]`, `login`

---

## Style

**Style:** Flat Design (not Data-Dense Dashboard)

**Keywords:** 2D, minimalist, bold colors, no shadows, clean lines, simple shapes, typography-focused, icon-heavy

**Why different from MASTER:** MASTER's Data-Dense Dashboard style serves internal ops (max data density, technical mood). This surface is seen by clients viewing leads, estimates, and report deliverables — needs to read as clean and trustworthy, not operational.

## Color Palette (overrides MASTER)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#2563EB` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| Accent/CTA | `#EA580C` | `--color-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#1E293B` | `--color-foreground` |
| Muted | `#E9EFF8` | `--color-muted` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#2563EB` | `--color-ring` |

**Color Notes:** Trust blue + orange CTA (accent adjusted from `#F97316` for WCAG 3:1 contrast).

## Typography (overrides MASTER)

- **Font:** Plus Jakarta Sans (headings + body — not Fira Code/Fira Sans)
- **Mood:** friendly, modern, saas, clean, approachable, professional
- **Google Fonts:** [Plus Jakarta Sans](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

## Key Effects

No gradients/shadows, simple hover (color/opacity shift only), fast loading, clean transitions (150-200ms ease), minimal icons (Lucide).

## Page-Specific Notes

- **`login`, `estimate`:** form-first. Visible labels (not placeholder-only), inline validation, errors shown adjacent to the field they belong to — not batched at the top.
- **`reports/[id]`:** client deliverable, rendered alongside a PDF export (`@react-pdf/renderer`). Screen layout should mirror the PDF's visual hierarchy so the client recognizes it as the same document.
- **Portal chat (`PortalChatMessage`):** needs visible feedback state — typing indicator, sent/delivered/read — never a silent request with no acknowledgement.
- **Mode:** light only by default. Do not default this surface to dark mode (MASTER's dark-mode support does not apply here).

## Anti-Patterns (Do NOT Use)

- Excessive animation
- Dark mode by default
- Data-dense layouts (tables/grids belong on the admin surface, not here)
