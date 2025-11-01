/*
  Warnings:

  - A unique constraint covering the columns `[poNumber]` on the table `PurchaseOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `poNumber` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalValue` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "POItem" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "poNumber" TEXT NOT NULL,
ADD COLUMN     "saleOrderId" INTEGER,
ADD COLUMN     "status" "POStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "totalValue" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_saleOrderId_idx" ON "PurchaseOrder"("saleOrderId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
