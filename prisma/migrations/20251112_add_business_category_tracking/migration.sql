-- AlterTable
ALTER TABLE "businessCategory" ADD COLUMN "createdBy" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "businessCategory" ADD COLUMN "updatedBy" INTEGER;
