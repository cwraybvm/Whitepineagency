import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const compA = searchParams.get("compA") || "Competitor A";
  const compB = searchParams.get("compB") || "Competitor B";

  try {
    // Simulated live directory indexing based on stable localized search data
    const mockDbLookup = (name: string) => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const reviews = Math.abs((hash % 180) + 20); // Dynamic but stable review count
      const rating = (Math.abs(hash % 10) / 10 + 4.0).toFixed(1); // Dynamic stable rating (4.0 - 4.9)
      return { reviews, rating: parseFloat(rating) };
    };

    const dataA = mockDbLookup(compA);
    const dataB = mockDbLookup(compB);

    return NextResponse.json({
      competitors: [
        { name: compA, reviews: dataA.reviews, rating: dataA.rating },
        { name: compB, reviews: dataB.reviews, rating: dataB.rating }
      ]
    });
  } catch (error) {
    console.error("Competitor lookup failed:", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}