import type { ScrapedSite } from './siteScraper';

export interface CompetitorEntry {
  name: string;
  url: string | null;
  scraped: ScrapedSite | null;
  source: 'scraped' | 'ai-estimated';
}

export interface SpeedResult {
  score: number;
  lcp: string;
  status: string;
  isRealGoogleData: boolean;
}

export interface CompetitorNote {
  name: string;
  likelySocialAngle: string;
  positioningNote: string;
}

export interface ContentStrategy {
  title: string;
  description: string;
}

export interface CompetitorAuditResult {
  client: ScrapedSite;
  speed: SpeedResult | null;
  competitors: CompetitorEntry[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  competitorNotes: CompetitorNote[];
  quickWins: string[];
  contentStrategies: ContentStrategy[];
  generatedAt: string;
}
