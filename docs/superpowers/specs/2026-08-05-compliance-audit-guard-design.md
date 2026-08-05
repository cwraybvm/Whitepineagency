# Ad Policy Compliance Guard Design

**Goal:** A new Sandbox tab where a user pastes ad copy, gets it scanned against Meta/Google ad policy patterns (personal attributes, before/after claims, financial claims, etc.), sees a scored compliance report with per-violation severity and suggested rewrites, and can insert the auto-corrected copy directly into any generation tool's brief field. Exports as a white-labeled HTML or Markdown audit report.

**Scope decision — Tab 2 deferred:** The task's "Competitor Counter-Positioning Matrix" has no schema, prompt, route, or data source specified anywhere — no competitor URL/text input, nothing in the app to pull competitor data from. Building it now means guessing requirements nobody wrote down. This pass ships Tab 1 (Compliance Scanner) only; Tab 2 needs its own brainstorming pass once there's a concrete idea of what "competitor input" means.

**Scope decision — paste-only, no draft lifting:** "Select from active draft" and "Replace Copy" implied reading/writing another panel's live draft state, but no panel's draft is currently accessible outside itself — building that would be a state-lift of the same size as the earlier Active Brand DNA effort, for a feature the task didn't actually detail. Instead: the scanner is paste-only, and "Replace Copy" reuses the *existing* `onInsertPhrase`/`pendingInsert` mechanism already wired at `page.tsx` (built for Brand Identity's Key Verbal Tracks) — `cleanCopy` gets inserted into a chosen tool's brief field in one click, zero new plumbing.

## Architecture

### 1. Schema & prompt — `src/lib/sandboxPrompts.ts` (extend)

```ts
const ComplianceViolationSchema = z
  .object({
    policy: z.string().catch(''),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).catch('LOW'),
    flagReason: z.string().catch(''),
    suggestedRewrite: z.string().catch(''),
  })
  .catch({ policy: '', severity: 'LOW', flagReason: '', suggestedRewrite: '' });

export const ComplianceReportSchema = z.object({
  complianceScore: z.number().min(0).max(100).catch(100),
  status: z.enum(['PASSED', 'WARNING', 'CRITICAL_RISK']).catch('PASSED'),
  violations: z.array(ComplianceViolationSchema).catch([]),
  cleanCopy: z.string().catch(''),
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
```

`COMPLIANCE_AUDITOR_PROMPT` instructs the LLM to strictly evaluate the given copy against Meta Ad Policy patterns (personal attributes/implying the reader's traits, before/after or unrealistic-outcome claims, unsubstantiated financial claims) and Google Search ad policy patterns (misleading claims, prohibited content), score 0-100, set `status` from the score (PASSED ≥ 80, WARNING 50-79, CRITICAL_RISK < 50 — same 3-tier banding the codebase already uses for `ScoreBadge`'s quality tiers), list every violation found with a suggested fix, and produce `cleanCopy` — the full input rewritten to resolve every flagged violation.

`mockComplianceReport()` follows the `[MOCK]`-prefix convention: a WARNING-status report with one representative violation and a `cleanCopy` fallback.

### 2. Route — `src/app/api/sandbox/audit-compliance/route.ts` (new)

```ts
export async function POST(req: Request) {
  try {
    const { copyText, platform } = await req.json();
    if (!copyText?.trim()) {
      return NextResponse.json({ error: 'copyText is required' }, { status: 400 });
    }
    const userContext = `Platform: ${platform || 'General (Meta + Google)'}\n\nCopy to audit:\n${copyText}`;
    const result = await callOpenAiJson(COMPLIANCE_AUDITOR_PROMPT, userContext, () => mockComplianceReport(), 0.3, ComplianceReportSchema);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox audit-compliance error:', err);
    return NextResponse.json({ error: err.message || 'Compliance audit failed' }, { status: 500 });
  }
}
```

Temperature `0.3` (not the usual `0.7`) — policy auditing should be consistent/deterministic, not creative, matching the low-temperature choice already used for `CRITIC_PROMPT`'s evaluation call elsewhere in this file. No `activeBrandDna` in the request — policy compliance is objective, not brand-voice-flavored, so it's deliberately excluded from this prompt (the panel still shows the badge for UI consistency but doesn't send it to this route).

### 3. Exporter — `src/lib/auditExport.ts` (new)

- `buildComplianceAuditMarkdown(report: ComplianceReport, sourceCopy: string): string` — sectioned report: score/status header, original copy, violations table (policy/severity/reason/rewrite), clean copy — same style as the existing `buildSwipeFileMarkdown`.
- `buildComplianceAuditHtml(report: ComplianceReport, sourceCopy: string, brandName?: string): string` — one self-contained HTML document, inline `<style>`, color-coded severity/status chips matching the app's existing emerald/amber/red tier palette (`ScoreBadge`'s convention). A small local `escapeHtml()` helper (kept file-local rather than shared — it's a 6-line pure function, not worth a shared module for two call sites, matching how small per-file consts like `FALLBACK_BRAND_COLOR` are already duplicated across sandbox panels rather than centralized).

No JSON export — not requested for this exporter (unlike the swipe-file and master-campaign exporters, which do have one), so none is added.

### 4. UI — `src/components/sandbox/ComplianceAuditPanel.tsx` (new)

Single-mode (Tab 1 only), same left-controls/right-results grid as every other generation panel:

- **Left:** platform select (`Meta` / `Google` / `TikTok` / general default), copy-to-audit textarea (paste-only), "Scan Compliance" button, `ActiveBrandDnaBadge` shown when `activeBrandDna` is set (display-only, not sent to the route).
- **Right, once a report exists:**
  - Status badge (`PASSED`/`WARNING`/`CRITICAL_RISK`) + `complianceScore`, colored via the existing emerald/amber/red tier convention.
  - Violations list: one card per violation, a severity chip (LOW/MEDIUM/HIGH, same 3-color convention), `policy`, `flagReason`, `suggestedRewrite`.
  - Clean copy card: the corrected `cleanCopy` text, a `CopyButton` (reused as-is), and a "Replace Copy" dropdown listing the same 4 generation tools already used by Brand Identity's verbal-track insert action (`copy`/`ad`/`video`/`campaign` — small local const, duplicated rather than imported cross-panel, matching this codebase's existing precedent for trivial per-file consts). Selecting one calls the `onInsertPhrase` prop.
  - Export dropdown (same hand-rolled pattern as the other panels) with two items: Download HTML Report, Download Markdown Report.

New props: `activeBrandDna?: BrandDna | null`, `onInsertPhrase: (tool: SandboxTool, text: string) => void`.

### 5. Wiring — `types.ts` + `page.tsx` (extend)

- `SandboxTool` gains `'compliance-audit'`.
- `TABS` gains `{ id: 'compliance-audit', label: 'Policy & Competitor Audit', icon: ShieldCheck }`.
- `page.tsx` renders `<ComplianceAuditPanel activeBrandDna={activeBrandDna} onInsertPhrase={(tool, text) => { setPendingInsert({ tool, text }); setActiveTool(tool); }} />` — reusing the exact same inline handler already written for `BrandIdentityPanel`.

## Error handling

Route: 400 for missing `copyText`, 500 for anything unexpected — matches every other sandbox route. `callOpenAiJson` degrades to `mockComplianceReport()` when no provider key is set, never throws on malformed output. Component: fetch failures via `toast.error`, scanning state resets in a `finally` block.

## Testing

- `npx tsc --noEmit` — zero errors.
- Manual: with no LLM provider key set, paste sample copy, run a scan, confirm the mock WARNING report renders with a violation card and clean copy, "Replace Copy" into Copy Studio switches tabs and pre-fills the brief, both exports download and open correctly.
