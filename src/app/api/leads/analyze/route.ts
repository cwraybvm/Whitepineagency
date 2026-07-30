import { NextResponse } from 'next/server';
// ❌ Remove: import { PrismaClient } from '@prisma/client';
// ❌ Remove: const db = new PrismaClient();

import { db } from '../../../../lib/db'; // 🔗 Link directly to the main database client instead

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();
    
    // 1. Find the target lead
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // 2. Call the AI API (using OpenRouter / OpenAI standard fetch structure)
    // Ensure OPENAI_API_KEY is configured in your Vercel Environment Variables
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Fast and hyper-efficient for data sorting
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert growth agency B2B data analyzer. Analyze the provided company details and return a valid JSON object matching this structure exactly: {\"priority\": \"Hot\" | \"Warm\" | \"Cold\", \"pitch\": \"string outreach email copy structure\"}"
          },
          {
            role: "user",
            content: `Company Name: ${lead.businessName}\nWebsite: ${lead.url}\nAudit Performance Score: ${lead.overallScore}/100.`
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // 3. Persist the AI findings into the database record
    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: {
        aiPriority: result.priority,
        aiOutreachScript: result.pitch
      }
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('AI Processing Grid Failure:', error);
    return NextResponse.json({ error: 'AI Matrix Pipeline Error' }, { status: 500 });
  }
}