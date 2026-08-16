-- CreateEnum
CREATE TYPE "FreeLensApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "freeLensApprovalStatus" "FreeLensApprovalStatus",
ADD COLUMN IF NOT EXISTS "freeLensApprovedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "freeLensApprovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "freeLensRejectedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "freeLensRejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "freeLensApprovalRemark" TEXT;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_freeLensApprovedBy_fkey') THEN
    ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_freeLensApprovedBy_fkey" FOREIGN KEY ("freeLensApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_freeLensRejectedBy_fkey') THEN
    ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_freeLensRejectedBy_fkey" FOREIGN KEY ("freeLensRejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
