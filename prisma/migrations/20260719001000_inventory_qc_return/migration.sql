-- QC return-to-inventory: pending Dispose/Reuse rows for Inward Queue
CREATE TYPE "InventoryQcReturnStatus" AS ENUM ('PENDING', 'REUSED', 'DISPOSED');

CREATE TABLE "InventoryQcReturn" (
    "id" SERIAL NOT NULL,
    "saleOrderId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER,
    "sourceStatus" TEXT NOT NULL,
    "rejectRemark" TEXT,
    "status" "InventoryQcReturnStatus" NOT NULL DEFAULT 'PENDING',
    "dispositionRemark" TEXT,
    "disposedAt" TIMESTAMP(3),
    "disposedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryQcReturn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryQcReturn_status_idx" ON "InventoryQcReturn"("status");
CREATE INDEX "InventoryQcReturn_saleOrderId_idx" ON "InventoryQcReturn"("saleOrderId");
CREATE INDEX "InventoryQcReturn_inventoryItemId_idx" ON "InventoryQcReturn"("inventoryItemId");

ALTER TABLE "InventoryQcReturn" ADD CONSTRAINT "InventoryQcReturn_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryQcReturn" ADD CONSTRAINT "InventoryQcReturn_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryQcReturn" ADD CONSTRAINT "InventoryQcReturn_disposedBy_fkey" FOREIGN KEY ("disposedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryQcReturn" ADD CONSTRAINT "InventoryQcReturn_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
