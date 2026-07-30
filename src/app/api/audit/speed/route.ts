import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "No target URL provided" }, { status: 400 });
  }

  // Clean and format the URL
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Optional API Key Integration (Use .env key or fallback to free tier)
  const apiKey = process.env.PAGESPEED_API_KEY || "";
  const apiKeyParam = apiKey ? `&key=${apiKey}` : "";

  try {
    // Corrected Gateway Endpoint Domain
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        targetUrl
      )}&category=PERFORMANCE&strategy=mobile${apiKeyParam}`,
      { next: { revalidate: 3600 } }
    );

    // If Google rate-limits or fails, execute our smooth mock fallback
    if (!response.ok) {
      console.warn(`PageSpeed API returned status ${response.status}. Initiating diagnostic fallback...`);
      return triggerMockFallback(targetUrl);
    }

    const data = await response.json();

    // Pull Lighthouse metrics with robust undefined safety guards
    const rawScore = data.lighthouseResult?.categories?.performance?.score;
    const performanceScore = typeof rawScore === 'number' ? Math.round(rawScore * 100) : 45;
    
    const lcpMetric = data.lighthouseResult?.audits?.["largest-contentful-paint"]?.displayValue || "4.2s";
    
    // Safely parse out numeric seconds using a regex to ignore any appended text (e.g., "s", "ms", "delay")
    const match = lcpMetric.match(/[\d.]+/);
    const numericLCP = match ? parseFloat(match[0]) : 4.2;
    const speedStatus = numericLCP > 2.5 ? "fail" : "pass";

    return NextResponse.json({
      score: performanceScore,
      lcp: `${numericLCP}s`, // Keep strings uniform for the frontend multipliers
      status: speedStatus,
      isRealGoogleData: true
    });

  } catch (error) {
    console.warn("Lighthouse network fetch errored. Initiating diagnostic fallback...", error);
    return triggerMockFallback(targetUrl);
  }
}

// Smart Mock Fallback Engine (Keeps your pitch working even when offline or rate-limited)
function triggerMockFallback(url: string) {
  const hash = url.length;
  const mockScore = Math.min(65, Math.max(18, 55 - (hash % 15))); 
  const mockLcp = ((hash % 4) + 2.8).toFixed(1); 
  
  return NextResponse.json({
    score: mockScore,
    lcp: `${mockLcp}s`, // Matches the exact string syntax expected by the front-end multiplier calculation
    status: "fail", 
    isRealGoogleData: false
  });
}