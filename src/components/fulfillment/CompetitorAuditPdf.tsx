'use client';

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { CompetitorAuditResult } from '@/lib/competitorAuditTypes';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1E293B',
  },
  eyebrow: {
    fontSize: 9,
    color: '#059669',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bulletDot: {
    width: 8,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
  competitorBlock: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  competitorName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  competitorMeta: {
    fontSize: 8,
    color: '#94A3B8',
    marginBottom: 3,
  },
  numberedItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  numberBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 3,
    marginRight: 8,
  },
  numberedText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
  strategyTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: '#94A3B8',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function Bullets({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) {
    return <Text style={{ fontSize: 8, color: '#94A3B8' }}>None identified.</Text>;
  }
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={[styles.bulletDot, { color }]}>&bull;</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

interface CompetitorAuditPdfProps {
  businessName: string;
  data: CompetitorAuditResult;
}

export default function CompetitorAuditPdf({ businessName, data }: CompetitorAuditPdfProps) {
  const generatedDate = new Date(data.generatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document title={`${businessName} - Competitive Intelligence Report`} author="White Pine">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>Competitive Intelligence Report</Text>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>
          {data.client.url} &middot; Generated {generatedDate}
        </Text>

        <Text style={styles.sectionTitle}>Website &amp; Marketing S.W.O.T.</Text>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { color: '#059669' }]}>Strengths</Text>
            <Bullets items={data.swot.strengths} color="#059669" />
          </View>
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { color: '#DC2626' }]}>Weaknesses</Text>
            <Bullets items={data.swot.weaknesses} color="#DC2626" />
          </View>
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { color: '#0369A1' }]}>Opportunities</Text>
            <Bullets items={data.swot.opportunities} color="#0369A1" />
          </View>
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { color: '#B45309' }]}>Threats</Text>
            <Bullets items={data.swot.threats} color="#B45309" />
          </View>
        </View>

        {data.speed && (
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 16 }}>
            <Text style={{ fontSize: 8, color: '#64748B' }}>
              Mobile Performance Score: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{data.speed.score}/100</Text> (LCP {data.speed.lcp})
              {!data.speed.isRealGoogleData && '  — estimated, PageSpeed API unavailable at scan time'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Top Competitors &amp; Social Positioning</Text>
        {data.competitors.map((comp, i) => {
          const note = data.competitorNotes.find((n) => n.name === comp.name);
          return (
            <View key={i} style={styles.competitorBlock}>
              <Text style={styles.competitorName}>{comp.name}</Text>
              <Text style={styles.competitorMeta}>
                {comp.url ? comp.url : 'AI-estimated competitor archetype (no live search API configured)'}
              </Text>
              {note && (
                <>
                  <Text style={{ fontSize: 9, marginTop: 2 }}>Social angle: {note.likelySocialAngle}</Text>
                  <Text style={{ fontSize: 9, marginTop: 1 }}>Positioning: {note.positioningNote}</Text>
                </>
              )}
              {comp.scraped && comp.scraped.socialLinks.length > 0 && (
                <Text style={{ fontSize: 8, color: '#64748B', marginTop: 2 }}>
                  Active on: {comp.scraped.socialLinks.map((s) => s.platform).join(', ')}
                </Text>
              )}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>3 Quick-Win 7-Day Edge Actions</Text>
        {data.quickWins.map((win, i) => (
          <View key={i} style={styles.numberedItem}>
            <Text style={styles.numberBadge}>{i + 1}</Text>
            <Text style={styles.numberedText}>{win}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>3 Content Strategies</Text>
        {data.contentStrategies.map((strategy, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={styles.strategyTitle}>{i + 1}. {strategy.title}</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{strategy.description}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>White Pine &middot; Competitive Intelligence Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
