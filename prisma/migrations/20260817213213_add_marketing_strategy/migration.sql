-- CreateTable
CREATE TABLE "MarketingStrategy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "auditSummary" TEXT NOT NULL,
    "roadmapItems" JSONB NOT NULL,
    "currentQuarter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingStrategy_organizationId_idx" ON "MarketingStrategy"("organizationId");

-- AddForeignKey
ALTER TABLE "MarketingStrategy" ADD CONSTRAINT "MarketingStrategy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
