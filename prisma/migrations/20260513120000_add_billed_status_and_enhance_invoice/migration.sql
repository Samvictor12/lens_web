-- AlterEnum: Add BILLED to SaleOrderStatus
ALTER TYPE "SaleOrderStatus" ADD VALUE 'BILLED';

-- AlterTable: Add new columns to Invoice
ALTER TABLE "Invoice"
  ADD COLUMN "customerId"   INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN "notes"        TEXT,
  ADD COLUMN "activeStatus" BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN "deleteStatus" BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN "createdBy"    INTEGER       NOT NULL DEFAULT 1,
  ADD COLUMN "updatedBy"    INTEGER;

-- Remove the temporary DEFAULT on customerId once data is in place
-- (Prisma will handle this via client; for existing rows set a safe default above)

-- AddForeignKey: Invoice → Customer
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Invoice → User (createdBy)
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Invoice → User (updatedBy)
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove temporary defaults now that FK constraints are satisfied
ALTER TABLE "Invoice" ALTER COLUMN "customerId" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "createdBy" DROP DEFAULT;
