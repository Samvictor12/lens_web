/*
  Warnings:

  - The values [PARTIALLY_RECEIVED] on the enum `POStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "DispatchStatus" ADD VALUE 'ON_HOLD';

-- AlterEnum
BEGIN;
CREATE TYPE "POStatus_new" AS ENUM ('DRAFT', 'RECEIVED', 'INVOICE_RECEIVED', 'CLOSED', 'CANCELLED');
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE "POStatus_new" USING ("status"::text::"POStatus_new");
ALTER TYPE "POStatus" RENAME TO "POStatus_old";
ALTER TYPE "POStatus_new" RENAME TO "POStatus";
DROP TYPE "public"."POStatus_old";
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SaleOrderStatus" ADD VALUE 'CLOSED';
ALTER TYPE "SaleOrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "SaleOrderStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "public"."PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_vendorId_fkey";

-- AlterTable
ALTER TABLE "DispatchCopy" ADD COLUMN     "actualDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "createdBy" INTEGER,
ADD COLUMN     "deliveryPersonId" INTEGER,
ADD COLUMN     "deliverySignature" TEXT,
ADD COLUMN     "expectedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "updatedBy" INTEGER;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "purchaseReceiptId" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "vendorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderReceipt" ADD COLUMN     "actualDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "inwardedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "itemDescription" TEXT,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "purchaseType" TEXT,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "supplierInvoiceNo" TEXT,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "parentId" INTEGER;

-- CreateTable
CREATE TABLE "PurchaseReceiptLog" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "purchaseReceiptId" INTEGER NOT NULL,
    "receivedItems" JSONB NOT NULL,
    "totalReceivedQty" DOUBLE PRECISION NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,
    "status" TEXT,
    "notes" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseReceiptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseReceiptLog_purchaseReceiptId_idx" ON "PurchaseReceiptLog"("purchaseReceiptId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLog" ADD CONSTRAINT "PurchaseReceiptLog_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLog" ADD CONSTRAINT "PurchaseReceiptLog_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseOrderReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLog" ADD CONSTRAINT "PurchaseReceiptLog_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLog" ADD CONSTRAINT "PurchaseReceiptLog_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchCopy" ADD CONSTRAINT "DispatchCopy_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseOrderReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
