-- CreateEnum
CREATE TYPE "CycleCountSessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CycleCountLineOutcome" AS ENUM ('UNCOUNTED', 'MATCH', 'SHORTAGE', 'OVERAGE', 'PENDING_RECOUNT');

-- CreateTable
CREATE TABLE "InventoryCycleCountSession" (
    "id" SERIAL NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "godownType" "GodownType" NOT NULL,
    "status" "CycleCountSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "location_id" INTEGER,
    "recountThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,
    "postedBy" INTEGER,

    CONSTRAINT "InventoryCycleCountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCycleCountLine" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "tray_id" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "lens_id" INTEGER NOT NULL,
    "sph" TEXT,
    "cyl" TEXT,
    "add" TEXT,
    "bookQty" DOUBLE PRECISION NOT NULL,
    "countedQty" DOUBLE PRECISION,
    "varianceQty" DOUBLE PRECISION,
    "outcome" "CycleCountLineOutcome" NOT NULL DEFAULT 'UNCOUNTED',
    "recountCount" INTEGER NOT NULL DEFAULT 0,
    "countedAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "InventoryCycleCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCycleCountSession_sessionNo_key" ON "InventoryCycleCountSession"("sessionNo");

-- CreateIndex
CREATE INDEX "InventoryCycleCountSession_godownType_status_idx" ON "InventoryCycleCountSession"("godownType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCycleCountLine_sessionId_inventoryItemId_key" ON "InventoryCycleCountLine"("sessionId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryCycleCountLine_sessionId_tray_id_idx" ON "InventoryCycleCountLine"("sessionId", "tray_id");

-- AddForeignKey
ALTER TABLE "InventoryCycleCountSession" ADD CONSTRAINT "InventoryCycleCountSession_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountSession" ADD CONSTRAINT "InventoryCycleCountSession_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountSession" ADD CONSTRAINT "InventoryCycleCountSession_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountSession" ADD CONSTRAINT "InventoryCycleCountSession_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountLine" ADD CONSTRAINT "InventoryCycleCountLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventoryCycleCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountLine" ADD CONSTRAINT "InventoryCycleCountLine_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountLine" ADD CONSTRAINT "InventoryCycleCountLine_tray_id_fkey" FOREIGN KEY ("tray_id") REFERENCES "TrayMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountLine" ADD CONSTRAINT "InventoryCycleCountLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCycleCountLine" ADD CONSTRAINT "InventoryCycleCountLine_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
