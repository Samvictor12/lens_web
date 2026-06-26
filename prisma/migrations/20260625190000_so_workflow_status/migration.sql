-- SO Workflow: new statuses, status log, procurement type, virtual location
-- Safe on empty/truncated DB. Run after truncate for clean enum swap.

-- ProcurementType
CREATE TYPE "ProcurementType" AS ENUM ('RX', 'STOCK');

-- SaleOrderStatusSource
CREATE TYPE "SaleOrderStatusSource" AS ENUM (
  'USER', 'SYSTEM', 'INVENTORY', 'PO', 'PRE_QC', 'POST_QC', 'PRODUCTION', 'DISPATCH', 'BILLING'
);

-- Replace SaleOrderStatus enum
ALTER TYPE "SaleOrderStatus" RENAME TO "SaleOrderStatus_old";

CREATE TYPE "SaleOrderStatus" AS ENUM (
  'DRAFT',
  'PO_RAISED',
  'PO_RECEIVED',
  'PO_CANCELLED',
  'PRE_QC',
  'PRE_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'PRODUCTION_READY',
  'IN_PRODUCTION',
  'ON_HOLD',
  'AWAITING_QUALITY',
  'POST_QC_REJECTED',
  'POST_QC_SCRAPPED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'INVOICED',
  'COMPLETED'
);

ALTER TABLE "SaleOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SaleOrder" ALTER COLUMN "status" TYPE "SaleOrderStatus" USING (
  CASE "status"::text
    WHEN 'CONFIRMED' THEN 'PRODUCTION_READY'
    WHEN 'BILLED' THEN 'COMPLETED'
    WHEN 'CLOSED' THEN 'COMPLETED'
    WHEN 'PROCESSING' THEN 'DRAFT'
    WHEN 'PENDING' THEN 'DRAFT'
    ELSE "status"::text
  END
)::"SaleOrderStatus";
ALTER TABLE "SaleOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"SaleOrderStatus";

DROP TYPE "SaleOrderStatus_old";

-- PO partial receive status
ALTER TYPE "POStatus" ADD VALUE IF NOT EXISTS 'PO_PARTIAL_RECEIVED' BEFORE 'RECEIVED';

-- SaleOrder new columns
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "procurementType" "ProcurementType" NOT NULL DEFAULT 'RX';
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "hasLinkedPoEver" BOOLEAN NOT NULL DEFAULT false;

-- Virtual location flag
ALTER TABLE "LocationMaster" ADD COLUMN IF NOT EXISTS "isVirtual" BOOLEAN NOT NULL DEFAULT false;

-- Status log table
CREATE TABLE IF NOT EXISTS "SaleOrderStatusLog" (
  "id" SERIAL NOT NULL,
  "saleOrderId" INTEGER NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "remark" TEXT,
  "source" "SaleOrderStatusSource" NOT NULL DEFAULT 'SYSTEM',
  "referenceType" TEXT,
  "referenceId" INTEGER,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleOrderStatusLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SaleOrderStatusLog_saleOrderId_idx" ON "SaleOrderStatusLog"("saleOrderId");
CREATE INDEX IF NOT EXISTS "SaleOrderStatusLog_createdAt_idx" ON "SaleOrderStatusLog"("createdAt");

ALTER TABLE "SaleOrderStatusLog" DROP CONSTRAINT IF EXISTS "SaleOrderStatusLog_saleOrderId_fkey";
ALTER TABLE "SaleOrderStatusLog" ADD CONSTRAINT "SaleOrderStatusLog_saleOrderId_fkey"
  FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleOrderStatusLog" DROP CONSTRAINT IF EXISTS "SaleOrderStatusLog_createdBy_fkey";
ALTER TABLE "SaleOrderStatusLog" ADD CONSTRAINT "SaleOrderStatusLog_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
