-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('INWARD_PO', 'INWARD_DIRECT', 'OUTWARD_SALE', 'OUTWARD_RETURN', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE');

-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_PRODUCTION', 'DAMAGED', 'RETURNED', 'QUALITY_CHECK');

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'Single';

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "batchNo" TEXT,
    "serialNo" TEXT,
    "lens_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "Type_id" INTEGER,
    "coating_id" INTEGER,
    "dia_id" INTEGER,
    "fitting_id" INTEGER,
    "tinting_id" INTEGER,
    "location_id" INTEGER,
    "tray_id" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION,
    "rightEye" BOOLEAN NOT NULL DEFAULT false,
    "leftEye" BOOLEAN NOT NULL DEFAULT false,
    "rightSpherical" TEXT,
    "rightCylindrical" TEXT,
    "rightAxis" TEXT,
    "rightAdd" TEXT,
    "leftSpherical" TEXT,
    "leftCylindrical" TEXT,
    "leftAxis" TEXT,
    "leftAdd" TEXT,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "expiryDate" TIMESTAMP(3),
    "manufactureDate" TIMESTAMP(3),
    "inwardDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseOrderId" INTEGER,
    "vendorId" INTEGER,
    "saleOrderId" INTEGER,
    "reservedDate" TIMESTAMP(3),
    "soldDate" TIMESTAMP(3),
    "qualityGrade" TEXT,
    "notes" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" SERIAL NOT NULL,
    "transactionNo" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "fromLocationId" INTEGER,
    "fromTrayId" INTEGER,
    "toLocationId" INTEGER,
    "toTrayId" INTEGER,
    "purchaseOrderId" INTEGER,
    "saleOrderId" INTEGER,
    "vendorId" INTEGER,
    "reason" TEXT,
    "notes" TEXT,
    "batchNo" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStock" (
    "id" SERIAL NOT NULL,
    "lens_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "Type_id" INTEGER,
    "coating_id" INTEGER,
    "location_id" INTEGER,
    "tray_id" INTEGER,
    "totalStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCostPrice" DOUBLE PRECISION,
    "lastCostPrice" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "lastInwardDate" TIMESTAMP(3),
    "lastOutwardDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "InventoryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" SERIAL NOT NULL,
    "alertType" TEXT NOT NULL,
    "lens_id" INTEGER,
    "location_id" INTEGER,
    "currentStock" DOUBLE PRECISION,
    "thresholdLevel" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_transactionNo_key" ON "InventoryTransaction"("transactionNo");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStock_lens_id_category_id_Type_id_coating_id_locat_key" ON "InventoryStock"("lens_id", "category_id", "Type_id", "coating_id", "location_id", "tray_id");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "LensCategoryMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_Type_id_fkey" FOREIGN KEY ("Type_id") REFERENCES "LensTypeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_dia_id_fkey" FOREIGN KEY ("dia_id") REFERENCES "LensDiaMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_fitting_id_fkey" FOREIGN KEY ("fitting_id") REFERENCES "LensFittingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tinting_id_fkey" FOREIGN KEY ("tinting_id") REFERENCES "LensTintingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tray_id_fkey" FOREIGN KEY ("tray_id") REFERENCES "TrayMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_fromTrayId_fkey" FOREIGN KEY ("fromTrayId") REFERENCES "TrayMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_toTrayId_fkey" FOREIGN KEY ("toTrayId") REFERENCES "TrayMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "LensCategoryMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_Type_id_fkey" FOREIGN KEY ("Type_id") REFERENCES "LensTypeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_tray_id_fkey" FOREIGN KEY ("tray_id") REFERENCES "TrayMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
