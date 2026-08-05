import type { ComplianceReport } from '@/lib/sandboxPrompts';

export function buildComplianceAuditMarkdown(report: ComplianceReport, sourceCopy: string): string {
  const lines = [
    `# Ad Policy Compliance Audit`,
    `Status: ${report.status} · Score: ${report.complianceScore}/100`,
    '',
    '## Original Copy',
    sourceCopy,
    '',
    '## Violations',
    ...(report.violations.length
      ? report.violations.map(
          (v, i) => `${i + 1}. **${v.policy}** [${v.severity}] — ${v.flagReason}\n   Suggested rewrite: ${v.suggestedRewrite}`,
        )
      : ['(none)']),
    '',
    '## Clean Copy',
    report.cleanCopy || '(none)',
  ];
  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STATUS_COLOR: Record<ComplianceReport['status'], string> = {
  PASSED: '#059669',
  WARNING: '#d97706',
  CRITICAL_RISK: '#dc2626',
};

const SEVERITY_COLOR: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#64748b',
  MEDIUM: '#d97706',
  HIGH: '#dc2626',
};

export function buildComplianceAuditHtml(report: ComplianceReport, sourceCopy: string, brandName?: string): string {
  const statusColor = STATUS_COLOR[report.status];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(brandName ? `${brandName} — Compliance Audit` : 'Ad Policy Compliance Audit')}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 24px 32px; border-bottom: 1px solid #1e293b; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  .status { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; color: #fff; background: ${statusColor}; }
  main { padding: 24px 32px; display: grid; gap: 24px; }
  section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 0 0 8px; }
  .copy-block { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; font-size: 13px; white-space: pre-wrap; }
  .violation { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
  .violation h3 { margin: 0 0 6px; font-size: 13px; }
  .severity { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: #fff; margin-left: 8px; }
  .violation p { margin: 6px 0 0; font-size: 13px; color: #cbd5e1; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(brandName ? `${brandName} — Compliance Audit` : 'Ad Policy Compliance Audit')}</h1>
  <span class="status">${escapeHtml(report.status)} · ${report.complianceScore}/100</span>
</header>
<main>
  <section>
    <h2>Original Copy</h2>
    <div class="copy-block">${escapeHtml(sourceCopy)}</div>
  </section>
  <section>
    <h2>Violations</h2>
    ${
      report.violations.length
        ? report.violations
            .map(
              (v) =>
                `<div class="violation"><h3>${escapeHtml(v.policy)}<span class="severity" style="background:${SEVERITY_COLOR[v.severity]}">${escapeHtml(v.severity)}</span></h3><p>${escapeHtml(v.flagReason)}</p><p><strong>Suggested rewrite:</strong> ${escapeHtml(v.suggestedRewrite)}</p></div>`,
            )
            .join('')
        : '<p>No violations found.</p>'
    }
  </section>
  <section>
    <h2>Clean Copy</h2>
    <div class="copy-block">${escapeHtml(report.cleanCopy || '(none)')}</div>
  </section>
</main>
</body>
</html>`;
}
