import { NextResponse } from 'next/server';
import { COMPLIANCE_AUDITOR_PROMPT, callOpenAiJson, mockComplianceReport, ComplianceReportSchema } from '@/lib/sandboxPrompts';

export async function POST(req: Request) {
  try {
    const { copyText, platform } = await req.json();
    if (!copyText?.trim()) {
      return NextResponse.json({ error: 'copyText is required' }, { status: 400 });
    }

    const userContext = `Platform: ${platform || 'General (Meta + Google)'}\n\nCopy to audit:\n${copyText}`;

    const result = await callOpenAiJson(
      COMPLIANCE_AUDITOR_PROMPT,
      userContext,
      () => mockComplianceReport(),
      0.3,
      ComplianceReportSchema,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Sandbox audit-compliance error:', err);
    return NextResponse.json({ error: err.message || 'Compliance audit failed' }, { status: 500 });
  }
}
