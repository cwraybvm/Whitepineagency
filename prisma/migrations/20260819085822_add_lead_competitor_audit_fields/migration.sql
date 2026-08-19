-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "competitorUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "auditData" JSONB;
