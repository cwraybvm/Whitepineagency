-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "accentColor" TEXT,
ADD COLUMN "disabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[];
