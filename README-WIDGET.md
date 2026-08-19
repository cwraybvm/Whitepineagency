# Competitor Audit Lead Magnet Widget

Embed a free "Competitor Audit" lead-capture form on any external site.

## Copy-paste snippet

Replace `https://your-production-domain.com` with this app's real deployed URL.

```html
<iframe
  src="https://your-production-domain.com/embed/competitor-audit"
  width="100%"
  height="520"
  style="border: none; max-width: 420px;"
  title="Free Competitor Audit"
></iframe>
```

That's it — no additional script tags or setup needed. The page at `/embed/competitor-audit` renders only the widget (no nav/footer), so it's safe to drop straight into an `<iframe>` on any external site.

## What happens on submit

1. Visitor enters their website URL + email and clicks "Get Free Competitor Audit".
2. `POST /api/leads/capture` saves a `Lead` record and immediately runs the existing competitor-intel audit (`/api/audit/competitor-intel`) against their site.
3. On success, the widget shows a "Download PDF Report" button (generated client-side, same PDF used by the internal `/fulfillment/competitor-audit` tool). If report generation fails, it shows a "check your email" message instead — the lead is still captured either way.
