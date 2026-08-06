-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'OPERATOR', 'SALES', 'CLIENT_OWNER', 'CLIENT_MEMBER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'default-org',
    "domain" TEXT,
    "primaryKeyword" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "customDomain" TEXT,
    "brandVoice" TEXT,
    "brandGuidelines" TEXT,
    "webhookUrl" TEXT,
    "twilioPhoneNumber" TEXT,
    "mailchimpApiKey" TEXT,
    "mailchimpListId" TEXT,
    "wordpressUrl" TEXT,
    "wordpressUsername" TEXT,
    "wordpressAppPass" TEXT,
    "metaPageAccessToken" TEXT,
    "metaPageId" TEXT,
    "linkedInAccessToken" TEXT,
    "linkedInAuthorUrn" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" "UserRole" NOT NULL DEFAULT 'SALES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT 'Unknown Company',
    "url" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT 'N/A',
    "phone" TEXT NOT NULL DEFAULT 'N/A',
    "overallScore" INTEGER NOT NULL DEFAULT 50,
    "estimatedLoss" INTEGER NOT NULL DEFAULT 2500,
    "industry" TEXT NOT NULL DEFAULT 'Home Services',
    "stage" TEXT NOT NULL DEFAULT 'New Lead',
    "aiPriority" TEXT NOT NULL DEFAULT 'Stable',
    "memo" TEXT,
    "aiOutreachScript" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalNotes" TEXT,
    "content" TEXT,
    "blogMarkdown" TEXT,
    "emailDraft" TEXT,
    "instagramCaption" TEXT,
    "twitterThread" TEXT,
    "linkedinPost" TEXT,
    "reelScript" TEXT,
    "imagePrompt" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COPY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskColumn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderPosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCard" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "dueDate" TEXT,
    "tagLabel" TEXT DEFAULT 'General',
    "tagColor" TEXT DEFAULT 'bg-white/10 text-gray-300 border-white/15',
    "orderPosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientKpi" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "unit" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT 'Q3 2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTaskTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "dayOffset" INTEGER NOT NULL DEFAULT 1,
    "tagLabel" TEXT DEFAULT 'Recurring',
    "tagColor" TEXT DEFAULT 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL DEFAULT 'Anonymous',
    "senderContact" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "loomEmbedUrl" TEXT,
    "summaryNotes" TEXT,
    "metricsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoKeyword" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "currentRank" INTEGER NOT NULL DEFAULT 0,
    "previousRank" INTEGER NOT NULL DEFAULT 0,
    "searchVolume" INTEGER NOT NULL DEFAULT 0,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT 'Growth Retainer',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "jobCategory" TEXT NOT NULL DEFAULT 'General Service',
    "badge" TEXT NOT NULL DEFAULT '',
    "badgeColor" TEXT NOT NULL DEFAULT 'bg-slate-800 text-slate-200 border border-white/10',
    "source" TEXT NOT NULL DEFAULT 'organic_web',
    "fmsStatus" TEXT NOT NULL DEFAULT 'not_applicable',
    "fmsJobId" TEXT,
    "estimatedValue" INTEGER NOT NULL DEFAULT 0,
    "closedValue" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTechId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "unrepliedMinutes" INTEGER NOT NULL DEFAULT 0,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "pastJobCount" INTEGER,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateCount" INTEGER,
    "isSnoozed" BOOLEAN NOT NULL DEFAULT false,
    "snoozeUntil" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "dispatchNote" TEXT,
    "aiIssue" TEXT,
    "aiLocation" TEXT,
    "aiRequestedTime" TEXT,
    "aiIssueAudioTime" INTEGER,
    "aiLocationAudioTime" INTEGER,
    "aiTimeAudioTime" INTEGER,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "audioDuration" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalLeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "statusBadge" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalLeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalChatMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL DEFAULT 'N/A',
    "trade" TEXT NOT NULL DEFAULT 'General Trade',
    "status" TEXT NOT NULL DEFAULT 'Intake Pending',
    "contractValue" INTEGER NOT NULL DEFAULT 0,
    "driveFolderUrl" TEXT,
    "contactEmail" TEXT NOT NULL DEFAULT 'N/A',
    "contactPhone" TEXT NOT NULL DEFAULT 'N/A',
    "offerHeadline" TEXT,
    "notes" TEXT,
    "targetLinkUrl" TEXT,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAsset" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "offerDetails" TEXT,
    "driveFolderUrl" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "orderPosition" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FulfillmentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "executedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "organizationId" TEXT NOT NULL DEFAULT 'default-org',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "dataValue" TEXT NOT NULL,
    "riskLabel" TEXT NOT NULL,
    "riskColor" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "auditRunId" TEXT NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_customDomain_idx" ON "Organization"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_stage_idx" ON "Lead"("stage");

-- CreateIndex
CREATE INDEX "LeadMessage_leadId_idx" ON "LeadMessage"("leadId");

-- CreateIndex
CREATE INDEX "ContentPost_organizationId_idx" ON "ContentPost"("organizationId");

-- CreateIndex
CREATE INDEX "ContentPost_scheduledAt_idx" ON "ContentPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentPost_status_idx" ON "ContentPost"("status");

-- CreateIndex
CREATE INDEX "CreativeAsset_organizationId_idx" ON "CreativeAsset"("organizationId");

-- CreateIndex
CREATE INDEX "CreativeAsset_status_idx" ON "CreativeAsset"("status");

-- CreateIndex
CREATE INDEX "CreativeAsset_type_idx" ON "CreativeAsset"("type");

-- CreateIndex
CREATE INDEX "TaskColumn_organizationId_idx" ON "TaskColumn"("organizationId");

-- CreateIndex
CREATE INDEX "TaskCard_organizationId_idx" ON "TaskCard"("organizationId");

-- CreateIndex
CREATE INDEX "TaskCard_columnId_idx" ON "TaskCard"("columnId");

-- CreateIndex
CREATE INDEX "ClientKpi_organizationId_idx" ON "ClientKpi"("organizationId");

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_organizationId_idx" ON "RecurringTaskTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "InboxMessage_organizationId_idx" ON "InboxMessage"("organizationId");

-- CreateIndex
CREATE INDEX "MonthlyReport_organizationId_idx" ON "MonthlyReport"("organizationId");

-- CreateIndex
CREATE INDEX "SeoKeyword_organizationId_idx" ON "SeoKeyword"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "PortalLead_organizationId_idx" ON "PortalLead"("organizationId");

-- CreateIndex
CREATE INDEX "PortalLead_status_idx" ON "PortalLead"("status");

-- CreateIndex
CREATE INDEX "PortalLeadEvent_leadId_idx" ON "PortalLeadEvent"("leadId");

-- CreateIndex
CREATE INDEX "PortalChatMessage_leadId_idx" ON "PortalChatMessage"("leadId");

-- CreateIndex
CREATE INDEX "FulfillmentTask_organizationId_idx" ON "FulfillmentTask"("organizationId");

-- CreateIndex
CREATE INDEX "FulfillmentTask_status_idx" ON "FulfillmentTask"("status");

-- CreateIndex
CREATE INDEX "IntakeAsset_taskId_idx" ON "IntakeAsset"("taskId");

-- CreateIndex
CREATE INDEX "FulfillmentChecklistItem_taskId_idx" ON "FulfillmentChecklistItem"("taskId");

-- CreateIndex
CREATE INDEX "AuditRun_organizationId_idx" ON "AuditRun"("organizationId");

-- CreateIndex
CREATE INDEX "Metric_auditRunId_idx" ON "Metric"("auditRunId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadMessage" ADD CONSTRAINT "LeadMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskColumn" ADD CONSTRAINT "TaskColumn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCard" ADD CONSTRAINT "TaskCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCard" ADD CONSTRAINT "TaskCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "TaskColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKpi" ADD CONSTRAINT "ClientKpi_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTaskTemplate" ADD CONSTRAINT "RecurringTaskTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoKeyword" ADD CONSTRAINT "SeoKeyword_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalLead" ADD CONSTRAINT "PortalLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalLeadEvent" ADD CONSTRAINT "PortalLeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PortalLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalChatMessage" ADD CONSTRAINT "PortalChatMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PortalLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentTask" ADD CONSTRAINT "FulfillmentTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAsset" ADD CONSTRAINT "IntakeAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FulfillmentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentChecklistItem" ADD CONSTRAINT "FulfillmentChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FulfillmentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRun" ADD CONSTRAINT "AuditRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
