import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { scrapeSite, type ScrapedSite } from '@/lib/siteScraper';
import type { CompetitorEntry, SpeedResult } from '@/lib/competitorAuditTypes';

export const dynamic = 'force-dynamic';

// Matches src/app/api/fulfillment/checklist/route.ts's convention -- any
// authenticated session, not OWNER-only, since this tool is meant to be
// reachable from /fulfillment (OWNER + OPERATOR per proxy.ts).
async function requireAuth() {
  const store = await cookies();
  return Boolean(store.get('auth_token')?.value?.trim() || store.get('user_session')?.value?.trim());
}

export async function POST(req: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in environment variables.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  const { clientUrl, businessName, competitorUrls } = (body ?? {}) as {
    clientUrl?: string;
    businessName?: string;
    competitorUrls?: string[];
  };

  if (!clientUrl || !clientUrl.trim()) {
    return NextResponse.json({ error: 'clientUrl is required' }, { status: 400 });
  }

  let client: ScrapedSite;
  try {
    client = await scrapeSite(clientUrl);
  } catch (err: any) {
    return NextResponse.json({ error: `Could not scan client site: ${err.message}` }, { status: 400 });
  }

  // Reps can name up to 2 known competitor URLs (real scrape); any
  // remaining slots get an AI-estimated competitor archetype below since no
  // live search API (Tavily/SerpApi/etc) is configured in this environment.
  const providedCompetitorUrls = (competitorUrls ?? []).filter((u) => u && u.trim()).slice(0, 2);
  const competitors: CompetitorEntry[] = [];
  for (const compUrl of providedCompetitorUrls) {
    try {
      const scraped = await scrapeSite(compUrl);
      competitors.push({ name: scraped.title || compUrl, url: scraped.url, scraped, source: 'scraped' });
    } catch {
      competitors.push({ name: compUrl, url: compUrl, scraped: null, source: 'ai-estimated' });
    }
  }

  // Reuses the existing PageSpeed integration (same-origin internal call)
  // instead of duplicating the Google PageSpeed fetch here.
  let speed: SpeedResult | null = null;
  try {
    const origin = new URL(req.url).origin;
    const speedRes = await fetch(`${origin}/api/audit/speed?url=${encodeURIComponent(client.url)}`);
    if (speedRes.ok) speed = await speedRes.json();
  } catch {
    speed = null;
  }

  const estimatedSlotsNeeded = 2 - competitors.length;

  const systemPrompt = `You are a marketing strategist producing a Competitive Intelligence brief for a local/SMB client.
You are given the client's real scraped website content, ${competitors.length} known/real competitor site(s) (if any), and how many more competitor slots (0-2) need an educated guess since no live web search is available in this environment.
Return a JSON object of exactly this shape:
{
  "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "estimatedCompetitors": [{ "name": string, "reasoning": string }],
  "competitorNotes": [{ "name": string, "likelySocialAngle": string, "positioningNote": string }],
  "quickWins": string[],
  "contentStrategies": [{ "title": string, "description": string }]
}
Rules:
- "swot" is 2-4 short bullet strings per category, about the CLIENT only, grounded in the scraped content you were given -- do not invent facts not supported by it.
- "estimatedCompetitors" must contain exactly ${estimatedSlotsNeeded} entries. Each names a plausible LOCAL COMPETITOR ARCHETYPE (e.g. "an established competitor offering similar services in the same metro area") -- never invent a specific real company name you were not given and cannot verify exists. If ${estimatedSlotsNeeded} is 0, return an empty array.
- "competitorNotes" covers every competitor you were given by name (both scraped and estimated), one sentence each on likely social-media angle and market positioning. Clearly speculative language for estimated ones.
- "quickWins" is exactly 3 short, concrete actions the client could realistically execute within 7 days.
- "contentStrategies" is exactly 3 ideas, each a short title plus a 1-2 sentence description.`;

  const userPrompt = JSON.stringify({
    businessName: businessName || client.title,
    client: {
      url: client.url,
      title: client.title,
      description: client.description,
      socialLinks: client.socialLinks,
      contentSnippet: client.textSnippet,
    },
    knownCompetitors: competitors.map((c) => ({
      name: c.name,
      url: c.url,
      description: c.scraped?.description ?? null,
      socialLinks: c.scraped?.socialLinks ?? [],
    })),
    additionalCompetitorSlotsNeeded: estimatedSlotsNeeded,
    realPerformanceScore: speed,
  });

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    return NextResponse.json({ error: 'Competitor intelligence generation failed' }, { status: 500 });
  }

  const aiData = await aiResponse.json();
  let parsed: any;
  try {
    parsed = JSON.parse(aiData.choices[0].message.content);
  } catch {
    return NextResponse.json({ error: 'AI returned malformed data' }, { status: 500 });
  }

  const estimatedCompetitors = Array.isArray(parsed.estimatedCompetitors) ? parsed.estimatedCompetitors : [];
  for (const est of estimatedCompetitors.slice(0, estimatedSlotsNeeded)) {
    competitors.push({
      name: typeof est?.name === 'string' && est.name.trim() ? est.name.trim() : 'Estimated local competitor',
      url: null,
      scraped: null,
      source: 'ai-estimated',
    });
  }

  return NextResponse.json({
    client,
    speed,
    competitors,
    swot: {
      strengths: Array.isArray(parsed.swot?.strengths) ? parsed.swot.strengths : [],
      weaknesses: Array.isArray(parsed.swot?.weaknesses) ? parsed.swot.weaknesses : [],
      opportunities: Array.isArray(parsed.swot?.opportunities) ? parsed.swot.opportunities : [],
      threats: Array.isArray(parsed.swot?.threats) ? parsed.swot.threats : [],
    },
    competitorNotes: Array.isArray(parsed.competitorNotes) ? parsed.competitorNotes : [],
    quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 3) : [],
    contentStrategies: Array.isArray(parsed.contentStrategies) ? parsed.contentStrategies.slice(0, 3) : [],
    generatedAt: new Date().toISOString(),
  });
}
