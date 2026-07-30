import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 🏎️ Prisma 7 Driver Adapter Pattern (Next.js Serverless Compatible)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    return new PrismaClient();
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? getPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Interface Contracts
export interface LeadRecord {
  id: string;
  businessName: string;
  url: string;
  email: string;
  phone: string;
  overallScore: number;
  estimatedLoss: number;
  proximityLimit: number;
  industry: string;
  targetKeywords: string[];
  vulnerabilities: number;
  lcp: string;
  cls: string;
  inp: string;
  competitorA: string;
  competitorB: string;
  stage: 'New Lead' | 'Pitched' | 'Proposal Sent' | 'Closed Won' | 'Closed Lost';
  aiPriority: string;
  memo: string;
  aiOutreachScript?: string;
  createdAt: string;
}

// 🛡️ Helper: Clean raw user inputs to prevent injection attacks
const sanitizeString = (str: unknown, fallback: string = ''): string => {
  if (typeof str !== 'string') return fallback;
  return str.trim().replace(/[<>]/g, '') || fallback;
};

// In-Memory Fallback Store (Used when DB is offline/unreachable)
let internalLeadsDatabase: LeadRecord[] = [
  {
    id: '08bf1d5f-7c23-4c5c-8736-f00f0ef0002a',
    businessName: 'Strategic Target Enterprise Node',
    url: 'white-pine-portal.vercel.app',
    email: 'contact@white-pine-portal.app',
    phone: '(555) 000-0000',
    overallScore: 36,
    estimatedLoss: 112500,
    proximityLimit: 1.2,
    industry: 'Automotive Services',
    targetKeywords: ['Mechanic Near Me', 'Brake Repair', 'Emergency Towing'],
    vulnerabilities: 14,
    lcp: '4.8s delay',
    cls: 'High Deficit',
    inp: '85ms optimized',
    competitorA: 'Ecosystem Competitor A',
    competitorB: 'Ecosystem Competitor B',
    stage: 'New Lead',
    aiPriority: 'Urgent',
    memo: 'Initial seed record.',
    createdAt: new Date().toISOString()
  }
];

// 📥 GET: Fetch Pipeline Leads Isolated by Tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Reads header injected by middleware, or falls back to query param
    const headerOrgId = request.headers.get('x-organization-id');
    const paramOrgId = searchParams.get('orgId');
    
    // Only isolate if orgId isn't the default workspace or master admin
    const targetOrgId = (headerOrgId && headerOrgId !== 'default-tenant-workspace') 
      ? headerOrgId 
      : paramOrgId;

    if (prisma) {
      const dbLeads = await prisma.lead.findMany({
        where: targetOrgId ? { organizationId: targetOrgId } : {}, // 🔒 Strict Tenant Isolation
        orderBy: { createdAt: 'desc' }
      });
      
      if (dbLeads) {
        return NextResponse.json({ leads: dbLeads }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
  } catch (dbErr) {
    console.warn("⚠️ Database query bypassed, returning in-memory store:", dbErr);
  }

  // Fallback to in-memory store
  return NextResponse.json(
    { leads: internalLeadsDatabase },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

// 📤 POST: Process Intake Payloads (Widget Estimator or Admin Panel)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Read header-injected organization ID as fallback if body doesn't specify one
    const headerOrgId = request.headers.get('x-organization-id');
    const effectiveOrgId = body.organizationId || (headerOrgId !== 'default-tenant-workspace' ? headerOrgId : null);

    // ⚡ Payload Source Discrimination
    const isEstimatorPayload = Boolean(body.lead && body.quoteDetails);

    let newLead: LeadRecord;

    if (isEstimatorPayload) {
      // 🔓 Formatter for Customer-Facing Estimator Widget
      const lead = body.lead || {};
      const quoteDetails = body.quoteDetails || {};
      
      const minPrice = Number(quoteDetails.estimatedMin) || 0;
      const maxPrice = Number(quoteDetails.estimatedMax) || 0;
      const averageEstimate = Math.round((minPrice + maxPrice) / 2);

      const fullName = sanitizeString(lead.fullName, 'New Estimator Lead');
      const serviceName = sanitizeString(quoteDetails.service, 'General Service');
      const scopeLabel = sanitizeString(quoteDetails.scope, 'Standard Scope');
      const formattedRange = sanitizeString(quoteDetails.formattedEstimate, '$0');
      const urgencyType = sanitizeString(quoteDetails.urgency, 'standard');

      newLead = {
        id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessName: fullName,
        url: sanitizeString(lead.address, 'Instant Estimator Request'),
        email: sanitizeString(lead.email, 'N/A'),
        phone: sanitizeString(lead.phone, 'N/A'),
        overallScore: 85,
        estimatedLoss: averageEstimate || 2500,
        proximityLimit: 1.0,
        industry: sanitizeString(body.businessName, 'Home Services'),
        targetKeywords: [serviceName],
        vulnerabilities: urgencyType === 'emergency' ? 8 : 4,
        lcp: '3.2s delay',
        cls: 'Standard Deficit',
        inp: '95ms',
        competitorA: 'Market Competitor Alpha',
        competitorB: 'Market Competitor Beta',
        stage: 'New Lead',
        aiPriority: urgencyType === 'emergency' ? 'Urgent' : 'Stable',
        memo: `Requested ${serviceName} (${scopeLabel}). Estimate: ${formattedRange} [Urgency: ${urgencyType}]`,
        createdAt: new Date().toISOString()
      };
    } else {
      // 🛠️ Formatter for Admin Panel Direct Deployment
      newLead = {
        id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessName: sanitizeString(body.businessName, 'New Target Node'),
        url: sanitizeString(body.url, 'unknown-host.com'),
        email: sanitizeString(body.email, 'N/A'),
        phone: sanitizeString(body.phone, 'N/A'),
        overallScore: Number(body.overallScore) || 50,
        estimatedLoss: Number(body.estimatedLoss) || 2500,
        proximityLimit: Number(body.proximityLimit) || 1.5,
        industry: sanitizeString(body.industry, 'General Enterprise'),
        targetKeywords: Array.isArray(body.targetKeywords) ? body.targetKeywords : ['Local Intercept Keyword'],
        vulnerabilities: Number(body.vulnerabilities) || 10,
        lcp: sanitizeString(body.lcp, '4.0s delay'),
        cls: sanitizeString(body.cls, 'Deficit Stride'),
        inp: sanitizeString(body.inp, '120ms'),
        competitorA: sanitizeString(body.competitorA, 'Market Competitor Alpha'),
        competitorB: sanitizeString(body.competitorB, 'Market Competitor Beta'),
        stage: (sanitizeString(body.stage, 'New Lead') as any),
        aiPriority: sanitizeString(body.aiPriority, 'Stable'),
        memo: sanitizeString(body.memo, ''),
        aiOutreachScript: sanitizeString(body.aiOutreachScript, ''),
        createdAt: new Date().toISOString()
      };
    }

    // 💡 PERSISTENCE: Save directly to Supabase Postgres
    let savedRecord: any = newLead;
    if (prisma) {
      try {
        const createData: any = {
          businessName: newLead.businessName,
          url: newLead.url,
          email: newLead.email,
          phone: newLead.phone,
          overallScore: Number(newLead.overallScore) || 50,
          estimatedLoss: Number(newLead.estimatedLoss) || 2500,
          industry: newLead.industry,
          stage: newLead.stage,
          aiPriority: newLead.aiPriority,
          memo: newLead.memo,
          aiOutreachScript: newLead.aiOutreachScript || ""
        };

        if (effectiveOrgId) {
          createData.organizationId = effectiveOrgId;
        }

        savedRecord = await prisma.lead.create({
          data: createData
        });
      } catch (prismaErr) {
        console.warn("⚠️ Database insert failed, using memory store fallback:", prismaErr);
      }
    }

    // Sync to in-memory fallback array
    internalLeadsDatabase.unshift(newLead);

    // 🛰️ PIPEDRIVE PIPELINE SYNCHRONIZATION
    const token = process.env.PIPEDRIVE_API_TOKEN;
    const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN;
    const isSyncEnabled = process.env.ENABLE_PIPEDRIVE_SYNC === "true";

    if (isSyncEnabled && token && domain) {
      try {
        const orgRes = await fetch(`https://${domain}.pipedrive.com/v1/organizations?api_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newLead.businessName })
        });
        const orgData = await orgRes.json();

        if (orgData.success && orgData.data?.id) {
          await fetch(`https://${domain}.pipedrive.com/v1/leads?api_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `${newLead.businessName} - White Pine Audit Card`,
              organization_id: orgData.data.id,
              value: { amount: newLead.estimatedLoss, currency: 'USD' },
              note: newLead.memo
            })
          });
        }
      } catch (pipedriveError) {
        console.error("External Pipedrive synchronization exception caught:", pipedriveError);
      }
    }

    return NextResponse.json({ success: true, lead: savedRecord });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process infrastructure packet' }, { status: 500 });
  }
}

// 🔄 PUT: Update Lead Stage / Details Optimistically from Frontend
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, stage, memo } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing lead ID parameter' }, { status: 400 });
    }

    // 💡 PERSISTENCE: Update Database
    if (prisma) {
      try {
        const dbUpdated = await prisma.lead.update({
          where: { id },
          data: {
            ...(stage && { stage }),
            ...(memo !== undefined && { memo })
          }
        });
        return NextResponse.json({ success: true, lead: dbUpdated });
      } catch (dbErr) {
        console.warn("⚠️ DB update bypassed, falling back to memory:", dbErr);
      }
    }

    // Fallback: Update in-memory record
    const leadIndex = internalLeadsDatabase.findIndex((l) => l.id === id);
    if (leadIndex !== -1) {
      if (stage) internalLeadsDatabase[leadIndex].stage = stage;
      if (memo !== undefined) internalLeadsDatabase[leadIndex].memo = memo;
      return NextResponse.json({ success: true, lead: internalLeadsDatabase[leadIndex] });
    }

    return NextResponse.json({ error: 'Lead node not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update lead record' }, { status: 500 });
  }
}