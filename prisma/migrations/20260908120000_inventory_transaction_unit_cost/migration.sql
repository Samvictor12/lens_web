-- CreateEnum
CREATE TYPE "InventoryTransactionStatus" AS ENUM ('OPEN', 'CONSUMED');

-- AlterTable
ALTER TABLE "InventoryTransaction"
  ADD COLUMN "parentTransactionId" INTEGER,
  ADD COLUMN "status" "InventoryTransactionStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "remainingQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventoryItemId_status_idx" ON "InventoryTransaction"("inventoryItemId", "status");

-- CreateIndex
CREATE INDEX "InventoryTransaction_parentTransactionId_idx" ON "InventoryTransaction"("parentTransactionId");

-- AddForeignKey
ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_parentTransactionId_fkey"
  FOREIGN KEY ("parentTransactionId") REFERENCES "InventoryTransaction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: source rows keep remainingQty = original quantity (OPEN);
-- non-source rows are not consumable.
UPDATE "InventoryTransaction"
SET "remainingQty" = "quantity",
    "status" = 'OPEN'
WHERE "type" IN ('INWARD_PO', 'INWARD_DIRECT', 'TRANSFER')
  AND "quantity" > 0;

UPDATE "InventoryTransaction"
SET "remainingQty" = 0
WHERE "type" NOT IN ('INWARD_PO', 'INWARD_DIRECT', 'TRANSFER');
