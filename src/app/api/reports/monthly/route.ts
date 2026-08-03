import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET (no organizationId) is meant for the daily Vercel Cron — it fans out
// across every active org and only actually *creates* a MonthlyReport once
// a calendar month has rolled over relative to the org's last one, so
// hitting this endpoint more often than monthly is a harmless no-op.
// GET (with organizationId) and POST are the manual admin paths: preview
// the HTML, or trigger + email on click.

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

// Same posture as /api/cron/sla-check: verify when CRON_SECRET is
// configured, warn-and-allow when it isn't rather than hard-locking local/
// preview environments that haven't set it yet.
function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('⚠️ CRON_SECRET not set — /api/reports/monthly cron path is running unauthenticated.');
    return true;
  }
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

interface ReportData {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  primaryColor: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  leadsCaptured: number;
  leadsCapturedPrevPeriod: number;
  estimatedPipelineValue: number;
  wonValue: number;
  wonCount: number;
  avgResponseMinutes: number | null;
  reviewCount: number | null;
  reviewGrowth: number | null;
  recipientEmail: string | null;
}

// 1. Data Compilation — leads captured, avg SLA response time, review growth,
// all scoped to the trailing 30-day window for the given organization.
async function compileReportData(organizationId: string): Promise<ReportData | null> {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - WINDOW_DAYS * DAY_MS);
  const prevPeriodStart = new Date(periodStart.getTime() - WINDOW_DAYS * DAY_MS);

  const [leads, leadsCapturedPrevPeriod, latestReviewKpi, priorReport, contactTask] = await Promise.all([
    prisma.portalLead.findMany({ where: { organizationId, createdAt: { gte: periodStart } } }),
    prisma.portalLead.count({ where: { organizationId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    prisma.clientKpi.findFirst({
      where: { organizationId, metricName: { contains: 'review', mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.monthlyReport.findFirst({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
    prisma.fulfillmentTask.findFirst({
      where: { organizationId, contactEmail: { not: 'N/A' } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const leadsCaptured = leads.length;
  const estimatedPipelineValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0);
  const wonLeads = leads.filter((l) => l.status === 'won');
  const wonValue = wonLeads.reduce((sum, l) => sum + (l.closedValue ?? 0), 0);

  // PortalLead.unrepliedMinutes is the real, already-tracked "time this
  // inbound lead sat unanswered" signal — the closest thing this schema has
  // to an SLA response clock, without adding a new field.
  const avgResponseMinutes =
    leadsCaptured > 0 ? Math.round(leads.reduce((sum, l) => sum + l.unrepliedMinutes, 0) / leadsCaptured) : null;

  const reviewCount = latestReviewKpi ? latestReviewKpi.currentValue : null;
  let reviewGrowth: number | null = null;
  const priorSnapshot = priorReport?.metricsSnapshot as { reviewCount?: number } | null;
  if (reviewCount !== null && typeof priorSnapshot?.reviewCount === 'number') {
    reviewGrowth = reviewCount - priorSnapshot.reviewCount;
  }

  return {
    organizationId,
    organizationName: organization.name,
    logoUrl: organization.logoUrl,
    primaryColor: organization.primaryColor || '#7c3aed',
    periodStart,
    periodEnd,
    periodLabel: `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    leadsCaptured,
    leadsCapturedPrevPeriod,
    estimatedPipelineValue,
    wonValue,
    wonCount: wonLeads.length,
    avgResponseMinutes,
    reviewCount,
    reviewGrowth,
    recipientEmail: contactTask?.contactEmail ?? null,
  };
}

function persistReport(data: ReportData) {
  const monthPeriod = `${data.periodEnd.getFullYear()}-${String(data.periodEnd.getMonth() + 1).padStart(2, '0')}`;
  const title = `${data.periodEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Performance Summary`;

  return prisma.monthlyReport.create({
    data: {
      organizationId: data.organizationId,
      title,
      monthPeriod,
      summaryNotes: `Auto-generated ${WINDOW_DAYS}-day summary: ${data.leadsCaptured} leads captured, ${data.avgResponseMinutes ?? 'N/A'} min avg response time.`,
      metricsSnapshot: {
        leadsCaptured: data.leadsCaptured,
        leadsCapturedPrevPeriod: data.leadsCapturedPrevPeriod,
        estimatedPipelineValue: data.estimatedPipelineValue,
        wonValue: data.wonValue,
        wonCount: data.wonCount,
        avgResponseMinutes: data.avgResponseMinutes,
        reviewCount: data.reviewCount,
        reviewGrowth: data.reviewGrowth,
        generatedAt: new Date().toISOString(),
      },
    },
  });
}

function pctBadge(current: number, prev: number): string {
  if (current === 0 && prev === 0) return '<span style="color:#94a3b8;font-size:12px;">No activity in prior period</span>';
  const delta = prev === 0 ? 100 : Math.round(((current - prev) / prev) * 100);
  const positive = delta >= 0;
  const color = positive ? '#059669' : '#dc2626';
  return `<span style="color:${color};font-size:12px;font-weight:700;">${positive ? '▲' : '▼'} ${Math.abs(delta)}% vs prior 30 days</span>`;
}

function reviewBadge(growth: number | null): string {
  if (growth === null) return '<span style="color:#94a3b8;font-size:12px;">No prior report to compare</span>';
  const positive = growth >= 0;
  const color = positive ? '#059669' : '#dc2626';
  return `<span style="color:${color};font-size:12px;font-weight:700;">${positive ? '▲' : '▼'} ${Math.abs(growth)} vs last report</span>`;
}

function statCard(label: string, value: string, badge: string): string {
  return `
    <td style="width:50%;padding:8px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${label}</div>
        <div style="font-size:28px;font-weight:800;color:#0f172a;margin:6px 0 4px;">${value}</div>
        ${badge}
      </div>
    </td>`;
}

// 2. PDF / HTML Template — a self-contained, inline-styled document (no
// external stylesheet) so it renders identically as an emailed HTML body
// and as a browser "Print to PDF" export.
function renderReportHtml(data: ReportData): string {
  const orgName = esc(data.organizationName);
  const brand = /^#[0-9a-fA-F]{3,8}$/.test(data.primaryColor) ? data.primaryColor : '#7c3aed';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${orgName} — Monthly Performance Report</title>
</head>
<body style="margin:0;padding:32px;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" style="max-width:680px;margin:0 auto;width:100%;border-collapse:collapse;">
    <tr>
      <td style="border-bottom:4px solid ${brand};padding-bottom:16px;">
        <table role="presentation" style="width:100%;">
          <tr>
            <td>
              ${data.logoUrl ? `<img src="${esc(data.logoUrl)}" alt="${orgName}" style="max-height:36px;display:block;margin-bottom:8px;" />` : ''}
              <div style="font-size:20px;font-weight:800;">${orgName}</div>
              <div style="font-size:13px;color:#64748b;">Monthly Performance Report · ${data.periodLabel}</div>
            </td>
            <td style="text-align:right;font-size:11px;color:#94a3b8;">Generated ${data.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:24px;"></td></tr>
    <tr>
      <td>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            ${statCard('Leads Captured', String(data.leadsCaptured), pctBadge(data.leadsCaptured, data.leadsCapturedPrevPeriod))}
            ${statCard('Avg. Response Time', data.avgResponseMinutes === null ? 'N/A' : `${data.avgResponseMinutes} min`, '<span style="color:#94a3b8;font-size:12px;">Lower is better</span>')}
          </tr>
          <tr>
            ${statCard('Google Review Growth', data.reviewCount === null ? 'N/A' : String(data.reviewCount), reviewBadge(data.reviewGrowth))}
            ${statCard('Est. Pipeline Value', `$${data.estimatedPipelineValue.toLocaleString()}`, `<span style="color:#94a3b8;font-size:12px;">${data.wonCount} won · $${data.wonValue.toLocaleString()} closed</span>`)}
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:28px;"></td></tr>
    <tr>
      <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;font-size:12px;color:#475569;line-height:1.6;">
        Figures reflect the trailing ${WINDOW_DAYS} days of activity captured through the White Pine platform for
        <strong>${orgName}</strong>. Response time is measured from inbound lead capture to first reply.
        Review growth compares against the most recently generated report; the first report for an account
        will show no comparison.
      </td>
    </tr>
    <tr><td style="height:24px;"></td></tr>
    <tr>
      <td style="text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;">
        Powered by White Pine
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 3. Distribution — Resend email delivery, same integration used by
// /api/leads/dispatch-email.
async function sendReportEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️ RESEND_API_KEY not set — logging report instead of emailing "${subject}" to ${to}.`);
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: 'White Pine Reports <reports@yourdomain.com>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Monthly report email failed for ${to}: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

// Cron entry point (no organizationId) fans out to every active org.
// Admin preview entry point (organizationId + format=html) returns the
// rendered document directly, without persisting anything.
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const format = searchParams.get('format');

  try {
    if (organizationId) {
      const data = await compileReportData(organizationId);
      if (!data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

      if (format === 'html') {
        return new NextResponse(renderReportHtml(data), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      return NextResponse.json({ data });
    }

    const organizations = await prisma.organization.findMany({ where: { status: 'ACTIVE' } });
    const results = [];
    for (const org of organizations) {
      const data = await compileReportData(org.id);
      if (!data) continue;

      const report = await persistReport(data);
      let emailed = false;
      if (data.recipientEmail) {
        emailed = await sendReportEmail(data.recipientEmail, `${report.title} — ${data.organizationName}`, renderReportHtml(data));
      }
      results.push({ organizationId: org.id, reportId: report.id, emailed });
    }

    return NextResponse.json({ success: true, generated: results.length, results });
  } catch (error) {
    console.error('Monthly report cron failed:', error);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}

// Manual admin trigger — generate, persist, and optionally email on click.
export async function POST(request: Request) {
  try {
    const { organizationId, dispatch, to } = await request.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const data = await compileReportData(organizationId);
    if (!data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const report = await persistReport(data);
    const html = renderReportHtml(data);

    let emailed = false;
    if (dispatch === 'email') {
      const recipient = to || data.recipientEmail;
      if (!recipient) {
        return NextResponse.json({ error: 'No recipient email on file for this org — pass `to` explicitly.' }, { status: 400 });
      }
      emailed = await sendReportEmail(recipient, `${report.title} — ${data.organizationName}`, html);
    }

    return NextResponse.json({ success: true, report, emailed, html });
  } catch (error: any) {
    console.error('Monthly report dispatch failed:', error);
    return NextResponse.json({ error: error.message || 'Report dispatch failed' }, { status: 500 });
  }
}
