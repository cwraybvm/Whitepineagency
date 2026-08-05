import { NextResponse } from 'next/server';
import {
  brandClauseFor,
  callOpenAiJson,
  LANDING_PAGE_SECTION_REFINE_PROMPT,
  mockSectionRefine,
  SectionRefineSchema,
} from '@/lib/sandboxPrompts';

export function validateRefineSectionInput(body: any): string | null {
  if (!body || typeof body.field !== 'string' || !body.field.trim()) return 'field is required';
  if (typeof body.instruction !== 'string' || !body.instruction.trim()) return 'instruction is required';
  if (body.currentValue !== undefined && typeof body.currentValue !== 'string') return 'currentValue must be a string';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationError = validateRefineSectionInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { field, currentValue = '', instruction, organizationId } = body;

    const userContext = [
      `Section field: ${field}`,
      `Current text: ${currentValue || '(empty)'}`,
      `Instruction: ${instruction}`,
    ].join('\n');

    const brandClause = await brandClauseFor(organizationId);
    const systemPrompt = `${LANDING_PAGE_SECTION_REFINE_PROMPT}\n\n${brandClause}`;

    const result = await callOpenAiJson(
      systemPrompt,
      userContext,
      () => mockSectionRefine(field, currentValue),
      0.7,
      SectionRefineSchema,
    );

    return NextResponse.json({ success: true, text: result.text });
  } catch (err: any) {
    console.error('Sandbox landing-page refine-section error:', err);
    return NextResponse.json({ error: err.message || 'Section refine failed' }, { status: 500 });
  }
}
