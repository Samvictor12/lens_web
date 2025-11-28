/*
  Warnings:

  - A unique constraint covering the columns `[reference_id]` on the table `PurchaseOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "Type_id" INTEGER,
ADD COLUMN     "activeStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "coating_id" INTEGER,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dia_id" INTEGER,
ADD COLUMN     "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "expectedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "fitting_id" INTEGER,
ADD COLUMN     "itemDescription" TEXT,
ADD COLUMN     "leftAdd" TEXT,
ADD COLUMN     "leftAxis" TEXT,
ADD COLUMN     "leftBase" TEXT,
ADD COLUMN     "leftBaseSize" TEXT,
ADD COLUMN     "leftBled" TEXT,
ADD COLUMN     "leftCylindrical" TEXT,
ADD COLUMN     "leftDia" TEXT,
ADD COLUMN     "leftEye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leftSpherical" TEXT,
ADD COLUMN     "lens_id" INTEGER,
ADD COLUMN     "narration" TEXT,
ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "purchaseType" TEXT,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "reference_id" TEXT,
ADD COLUMN     "rightAdd" TEXT,
ADD COLUMN     "rightAxis" TEXT,
ADD COLUMN     "rightBase" TEXT,
ADD COLUMN     "rightBaseSize" TEXT,
ADD COLUMN     "rightBled" TEXT,
ADD COLUMN     "rightCylindrical" TEXT,
ADD COLUMN     "rightDia" TEXT,
ADD COLUMN     "rightEye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rightSpherical" TEXT,
ADD COLUMN     "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "supplierInvoiceNo" TEXT,
ADD COLUMN     "taxAccount" TEXT,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tinting_id" INTEGER,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedBy" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_reference_id_key" ON "PurchaseOrder"("reference_id");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "LensCategoryMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_Type_id_fkey" FOREIGN KEY ("Type_id") REFERENCES "LensTypeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_dia_id_fkey" FOREIGN KEY ("dia_id") REFERENCES "LensDiaMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_fitting_id_fkey" FOREIGN KEY ("fitting_id") REFERENCES "LensFittingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tinting_id_fkey" FOREIGN KEY ("tinting_id") REFERENCES "LensTintingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
